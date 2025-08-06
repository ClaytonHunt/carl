# Dependency Validation Framework

Shared validation functions for CARL work item dependency analysis and execution ordering.

## Dependency Analysis

### Dependency Discovery
- [ ] Find all work item dependencies (direct and transitive)
- [ ] Build complete dependency graph
- [ ] Detect circular dependencies before execution
- [ ] Calculate topological sort for execution order
- [ ] Identify parallel execution opportunities

### Status Validation
- [ ] Verify all dependencies exist as valid work items
- [ ] Check dependency completion status
- [ ] Validate dependency status transitions
- [ ] Ensure proper parent-child relationships

### Execution Planning
- [ ] Group dependencies into execution layers
- [ ] Calculate parallel processing opportunities
- [ ] Identify critical path for project completion
- [ ] Handle cross-scope dependencies (story->feature->epic)

## Core Functions

### `build_dependency_graph()`
```bash
build_dependency_graph() {
    local start_item="$1"
    local graph_file="${2:-/tmp/dependency_graph.txt}"
    
    # Initialize graph file
    echo "# Dependency Graph for $(basename "$start_item")" > "$graph_file"
    echo "# Format: item_id -> dependency_id" >> "$graph_file"
    
    # Recursively build graph
    local visited=()
    _build_graph_recursive() {
        local current="$1"
        local current_id
        current_id=$(yq eval '.id' "$current" 2>/dev/null)
        
        # Skip if already visited
        for v in "${visited[@]}"; do
            [[ "$v" == "$current_id" ]] && return
        done
        visited+=("$current_id")
        
        # Get dependencies
        local deps
        deps=$(yq eval '.dependencies[]' "$current" 2>/dev/null)
        
        if [[ -n "$deps" ]]; then
            while IFS= read -r dep; do
                # Handle both ID and filename references
                local dep_id dep_file
                if [[ "$dep" =~ \.carl$ ]]; then
                    dep_file=$(find .carl/project -name "$dep" 2>/dev/null | head -1)
                    dep_id=$(yq eval '.id' "$dep_file" 2>/dev/null)
                else
                    dep_id="$dep"
                    dep_file=$(find .carl/project -name "*${dep}*.carl" 2>/dev/null | head -1)
                fi
                
                if [[ -n "$dep_file" ]]; then
                    echo "$current_id -> $dep_id" >> "$graph_file"
                    _build_graph_recursive "$dep_file"
                else
                    echo "$current_id -> $dep_id (missing)" >> "$graph_file"
                fi
            done <<< "$deps"
        fi
    }
    
    _build_graph_recursive "$start_item"
    echo "✅ Dependency graph built: $graph_file"
}
```

### `detect_circular_dependencies()`
```bash
detect_circular_dependencies() {
    local graph_file="$1"
    local temp_file="/tmp/cycle_check.txt"
    
    # Use topological sort to detect cycles
    # If topological sort fails, there are cycles
    
    # Extract nodes and edges
    local nodes=()
    local edges=()
    
    while IFS= read -r line; do
        [[ "$line" =~ ^# ]] && continue  # Skip comments
        [[ -z "$line" ]] && continue     # Skip empty lines
        
        if [[ "$line" =~ ^([^[:space:]]+)[[:space:]]*->[[:space:]]*([^[:space:]]+) ]]; then
            local from="${BASH_REMATCH[1]}"
            local to="${BASH_REMATCH[2]}"
            
            # Add nodes
            [[ ! " ${nodes[@]} " =~ " $from " ]] && nodes+=("$from")
            [[ ! " ${nodes[@]} " =~ " $to " ]] && nodes+=("$to")
            
            # Add edge
            edges+=("$from:$to")
        fi
    done < "$graph_file"
    
    # Kahn's algorithm for cycle detection
    local in_degree=()
    local queue=()
    local processed_count=0
    
    # Initialize in-degree
    for node in "${nodes[@]}"; do
        in_degree["$node"]=0
    done
    
    # Calculate in-degrees
    for edge in "${edges[@]}"; do
        local to="${edge#*:}"
        ((in_degree["$to"]++))
    done
    
    # Find nodes with no incoming edges
    for node in "${nodes[@]}"; do
        [[ ${in_degree["$node"]} -eq 0 ]] && queue+=("$node")
    done
    
    # Process queue
    while [[ ${#queue[@]} -gt 0 ]]; do
        local current="${queue[0]}"
        queue=("${queue[@]:1}")  # Remove first element
        ((processed_count++))
        
        # Remove edges from current node
        for edge in "${edges[@]}"; do
            if [[ "${edge%:*}" == "$current" ]]; then
                local to="${edge#*:}"
                ((in_degree["$to"]--))
                [[ ${in_degree["$to"]} -eq 0 ]] && queue+=("$to")
            fi
        done
    done
    
    # Check for cycles
    if [[ $processed_count -ne ${#nodes[@]} ]]; then
        echo "❌ Circular dependencies detected!"
        
        # Find remaining nodes (part of cycles)
        echo "   Nodes in dependency cycles:"
        for node in "${nodes[@]}"; do
            [[ ${in_degree["$node"]} -gt 0 ]] && echo "   - $node"
        done
        return 1
    fi
    
    echo "✅ No circular dependencies found"
    return 0
}
```

### `calculate_execution_layers()`
```bash
calculate_execution_layers() {
    local graph_file="$1"
    local output_file="${2:-/tmp/execution_layers.txt}"
    
    # Use topological sort to create execution layers
    local nodes=()
    local edges=()
    local in_degree=()
    
    # Parse graph
    while IFS= read -r line; do
        [[ "$line" =~ ^# ]] && continue
        [[ -z "$line" ]] && continue
        
        if [[ "$line" =~ ^([^[:space:]]+)[[:space:]]*->[[:space:]]*([^[:space:]]+) ]]; then
            local from="${BASH_REMATCH[1]}"
            local to="${BASH_REMATCH[2]}"
            
            [[ ! " ${nodes[@]} " =~ " $from " ]] && nodes+=("$from")
            [[ ! " ${nodes[@]} " =~ " $to " ]] && nodes+=("$to")
            edges+=("$from:$to")
        fi
    done < "$graph_file"
    
    # Initialize in-degrees
    for node in "${nodes[@]}"; do
        in_degree["$node"]=0
    done
    
    for edge in "${edges[@]}"; do
        local to="${edge#*:}"
        ((in_degree["$to"]++))
    done
    
    # Generate layers
    local layer=0
    local remaining_nodes=("${nodes[@]}")
    
    echo "# Execution Layers" > "$output_file"
    echo "# Format: Layer N: item1, item2, ..." >> "$output_file"
    
    while [[ ${#remaining_nodes[@]} -gt 0 ]]; do
        local current_layer=()
        
        # Find nodes with no dependencies in current layer
        for node in "${remaining_nodes[@]}"; do
            [[ ${in_degree["$node"]} -eq 0 ]] && current_layer+=("$node")
        done
        
        # If no nodes found, we have a cycle
        if [[ ${#current_layer[@]} -eq 0 ]]; then
            echo "❌ Cannot create execution layers - circular dependencies exist"
            return 1
        fi
        
        # Output current layer
        echo "Layer $layer: ${current_layer[*]}" >> "$output_file"
        echo "Layer $layer: ${current_layer[*]}"
        
        # Remove processed nodes and their edges
        local new_remaining=()
        for node in "${remaining_nodes[@]}"; do
            if [[ ! " ${current_layer[@]} " =~ " $node " ]]; then
                new_remaining+=("$node")
            fi
        done
        remaining_nodes=("${new_remaining[@]}")
        
        # Update in-degrees
        for processed_node in "${current_layer[@]}"; do
            for edge in "${edges[@]}"; do
                if [[ "${edge%:*}" == "$processed_node" ]]; then
                    local to="${edge#*:}"
                    ((in_degree["$to"]--))
                fi
            done
        done
        
        ((layer++))
    done
    
    echo "✅ Execution layers calculated: $output_file"
    return 0
}
```

### `validate_dependency_chain()`
```bash
validate_dependency_chain() {
    local work_item="$1"
    local errors=()
    
    echo "🔍 Validating dependency chain for $(basename "$work_item")..."
    
    # Build dependency graph
    local graph_file="/tmp/dep_graph_$(basename "$work_item").txt"
    if ! build_dependency_graph "$work_item" "$graph_file"; then
        errors+=("Failed to build dependency graph")
        echo "❌ Dependency validation failed:"
        printf "  - %s\n" "${errors[@]}"
        return 1
    fi
    
    # Check for circular dependencies
    if ! detect_circular_dependencies "$graph_file"; then
        errors+=("Circular dependencies detected")
    fi
    
    # Validate each dependency exists and is complete
    local deps
    deps=$(yq eval '.dependencies[]?' "$work_item" 2>/dev/null)
    
    if [[ -n "$deps" ]]; then
        while IFS= read -r dep; do
            [[ -z "$dep" ]] && continue
            
            # Find dependency file
            local dep_file
            if [[ "$dep" =~ \.carl$ ]]; then
                dep_file=$(find .carl/project -name "$dep" 2>/dev/null | head -1)
            else
                dep_file=$(find .carl/project -name "*${dep}*.carl" 2>/dev/null | head -1)
            fi
            
            if [[ -z "$dep_file" ]]; then
                errors+=("Dependency not found: $dep")
                continue
            fi
            
            # Check completion status
            local dep_status
            dep_status=$(yq eval '.status' "$dep_file" 2>/dev/null)
            if [[ "$dep_status" != "completed" ]]; then
                errors+=("Dependency not completed: $dep (status: $dep_status)")
            fi
            
        done <<< "$deps"
    fi
    
    # Clean up temp file
    [[ -f "$graph_file" ]] && rm "$graph_file"
    
    if [[ ${#errors[@]} -gt 0 ]]; then
        echo "❌ Dependency validation failed:"
        printf "  - %s\n" "${errors[@]}"
        return 1
    fi
    
    echo "✅ Dependency chain validation passed"
    return 0
}
```

### `find_executable_work_items()`
```bash
find_executable_work_items() {
    local scope_dir="$1"  # e.g., ".carl/project/stories"
    local ready_items=()
    
    echo "🔍 Finding ready-to-execute work items in $scope_dir..."
    
    # Find all pending work items
    while IFS= read -r -d '' file; do
        local status
        status=$(yq eval '.status' "$file" 2>/dev/null)
        
        if [[ "$status" == "pending" ]]; then
            # Check if dependencies are met
            if validate_dependency_chain "$file" >/dev/null 2>&1; then
                ready_items+=("$file")
            fi
        fi
    done < <(find "$scope_dir" -name "*.carl" -not -path "*/completed/*" -print0)
    
    # Report findings
    if [[ ${#ready_items[@]} -gt 0 ]]; then
        echo "✅ Ready to execute:"
        for item in "${ready_items[@]}"; do
            echo "  - $(basename "$item")"
        done
    else
        echo "⚠️  No work items ready for execution"
    fi
    
    # Return list via stdout for consumption
    printf "%s\n" "${ready_items[@]}"
}
```

## Cross-Scope Dependency Handling

### `resolve_cross_scope_dependencies()`
```bash
resolve_cross_scope_dependencies() {
    local work_item="$1"
    local scope_type
    scope_type=$(basename "$work_item" | sed 's/.*\.\(epic\|feature\|story\|tech\)\.carl$/\1/')
    
    case "$scope_type" in
        "story")
            # Stories can depend on other stories, features, or technical items
            _validate_story_dependencies "$work_item"
            ;;
        "feature")
            # Features can depend on epics or other features
            _validate_feature_dependencies "$work_item"
            ;;
        "epic")
            # Epics can depend on other epics or external systems
            _validate_epic_dependencies "$work_item"
            ;;
        "tech")
            # Technical items can depend on any scope type
            _validate_technical_dependencies "$work_item"
            ;;
    esac
}

_validate_story_dependencies() {
    local story="$1"
    local parent_feature
    parent_feature=$(yq eval '.parent_feature' "$story" 2>/dev/null)
    
    if [[ -n "$parent_feature" && "$parent_feature" != "null" ]]; then
        local feature_file
        feature_file=$(find .carl/project/features -name "*${parent_feature}*.carl" 2>/dev/null | head -1)
        
        if [[ -z "$feature_file" ]]; then
            echo "❌ Parent feature not found: $parent_feature"
            return 1
        fi
        
        # Check if feature is ready for story execution
        local feature_status
        feature_status=$(yq eval '.status' "$feature_file" 2>/dev/null)
        if [[ "$feature_status" == "completed" ]]; then
            echo "⚠️  Parent feature already completed: $parent_feature"
        fi
    fi
    
    return 0
}
```

## Usage Example

```bash
# In command files
source .carl/commandlib/shared/dependency-validation.md

# Validate dependency chain before execution
if ! validate_dependency_chain "$work_item_path"; then
    echo "Cannot execute - dependency requirements not met"
    exit 1
fi

# Find all ready-to-execute items
ready_stories=$(find_executable_work_items ".carl/project/stories")
if [[ -n "$ready_stories" ]]; then
    echo "Executing ready stories in parallel:"
    # Process ready stories
fi
```

## Integration Points

This framework integrates with:
- **Work item validation** - Ensures dependencies are valid work items
- **Execution planning** - Determines optimal execution order
- **Parallel processing** - Identifies items that can run simultaneously
- **Progress tracking** - Updates dependency status as items complete