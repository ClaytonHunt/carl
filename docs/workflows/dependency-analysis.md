# Dependency Analysis Algorithms

## Dependency Discovery Process

### Step 1: Child Item Enumeration
```bash
# For Feature execution - find all child stories
parent_feature="user-registration.feature.carl"
child_stories=$(find .carl/project/stories -name "*.story.carl" -exec grep -l "parent_feature: $(basename "$parent_feature" .feature.carl)" {} \;)

# For Epic execution - find all child features  
parent_epic="user-authentication.epic.carl"
child_features=$(find .carl/project/features -name "*.feature.carl" -exec grep -l "parent_epic: $(basename "$parent_epic" .epic.carl)" {} \;)
```

### Step 2: Dependency Relationship Extraction
```bash
# Extract dependencies field from each work item
for work_item in $child_items; do
  dependencies=$(yq eval '.dependencies[]' "$work_item" 2>/dev/null || echo "")
  echo "$work_item: $dependencies"
done
```

## Dependency Graph Construction

**Graph Representation**:
```
Work Item Dependencies → Directed Acyclic Graph (DAG)
- Nodes: Work items (stories/features)
- Edges: Dependency relationships (A depends on B)
- Validation: Ensure no circular dependencies
```

**Circular Dependency Detection**:
```bash
# Depth-First Search to detect cycles
detect_circular_dependencies() {
  local visited=()
  local recursion_stack=()
  
  for work_item in $all_work_items; do
    if [[ ! " ${visited[@]} " =~ " ${work_item} " ]]; then
      if dfs_cycle_check "$work_item" visited recursion_stack; then
        echo "ERROR: Circular dependency detected involving $work_item"
        return 1
      fi
    fi
  done
  return 0
}
```

## Execution Order Algorithm

**Topological Sort Implementation**:
```bash
# Kahn's Algorithm for dependency ordering
topological_sort() {
  local work_items=("$@")
  local in_degree=()
  local queue=()
  local execution_order=()
  
  # Calculate in-degree for each work item
  for item in "${work_items[@]}"; do
    dependencies=$(yq eval '.dependencies[]?' "$item")
    in_degree["$item"]=$(echo "$dependencies" | wc -l)
    
    # Add items with no dependencies to queue
    if [[ ${in_degree["$item"]} -eq 0 ]]; then
      queue+=("$item")
    fi
  done
  
  # Process queue
  while [[ ${#queue[@]} -gt 0 ]]; do
    current="${queue[0]}"
    queue=("${queue[@]:1}")  # Remove first element
    execution_order+=("$current")
    
    # Reduce in-degree for dependent items
    for item in "${work_items[@]}"; do
      dependencies=$(yq eval '.dependencies[]?' "$item")
      if [[ "$dependencies" =~ $(basename "$current" .carl) ]]; then
        ((in_degree["$item"]--))
        if [[ ${in_degree["$item"]} -eq 0 ]]; then
          queue+=("$item")
        fi
      fi
    done
  done
  
  echo "${execution_order[@]}"
}
```

## Parallel Execution Strategy

**Parallel vs Sequential Decision Matrix**:
```
Independent Work Items (no shared dependencies):
├── Execute in parallel using background processes
├── Monitor completion status simultaneously  
└── Proceed when all parallel items complete

Dependent Work Items (dependency chain):
├── Execute in topological order (sequential)
├── Wait for each item to complete before starting next
└── Handle failures by stopping dependent item execution

Mixed Dependencies:
├── Group independent items into parallel batches
├── Execute batches sequentially based on dependency layers
└── Optimize for maximum parallelism within constraints
```

**Parallel Execution Implementation**:
```bash
execute_parallel_batch() {
  local batch_items=("$@")
  local pids=()
  
  # Start all items in parallel
  for item in "${batch_items[@]}"; do
    execute_work_item "$item" &
    pids+=($!)
  done
  
  # Wait for all to complete
  for pid in "${pids[@]}"; do
    wait $pid
    if [[ $? -ne 0 ]]; then
      echo "ERROR: Parallel execution failed for batch"
      return 1
    fi
  done
  
  echo "✅ Parallel batch completed successfully"
}
```

## Dependency Layer Analysis

**Execution Layer Calculation**:
```bash
# Group work items by dependency depth
calculate_execution_layers() {
  local work_items=("$@")
  local layers=()
  local current_layer=0
  local remaining_items=("${work_items[@]}")
  
  while [[ ${#remaining_items[@]} -gt 0 ]]; do
    local layer_items=()
    local next_remaining=()
    
    # Find items with no dependencies in remaining items
    for item in "${remaining_items[@]}"; do
      dependencies=$(yq eval '.dependencies[]?' "$item")
      local has_unmet_deps=false
      
      for dep in $dependencies; do
        # Check if dependency is still in remaining items
        if [[ " ${remaining_items[@]} " =~ " ${dep} " ]]; then
          has_unmet_deps=true
          break
        fi
      done
      
      if [[ "$has_unmet_deps" == false ]]; then
        layer_items+=("$item")
      else
        next_remaining+=("$item")
      fi
    done
    
    layers[$current_layer]="${layer_items[@]}"
    remaining_items=("${next_remaining[@]}")
    ((current_layer++))
  done
  
  echo "Execution layers calculated: ${#layers[@]} layers"
  for i in "${!layers[@]}"; do
    echo "Layer $i: ${layers[$i]}"
  done
}
```

## Execution Orchestration

**Feature-Level Execution Flow**:
```
1. Enumerate child stories
2. Extract dependencies from each story
3. Detect circular dependencies (fail if found)
4. Calculate execution layers using topological sort
5. Execute layers sequentially:
   - Within each layer: execute stories in parallel
   - Between layers: wait for layer completion before next
6. Validate feature completion when all stories done
```

**Epic-Level Execution Flow**:
```
1. Enumerate child features
2. Check feature completeness (features may need story breakdown)
3. For incomplete features: invoke /carl:plan to create missing stories
4. For complete features: apply Feature-Level Execution Flow
5. Execute feature layers with mixed planning/execution handling
6. Validate epic completion when all features done
```

## Error Handling in Dependency Execution

**Failure Propagation Strategy**:
- **Independent Item Failure**: Other parallel items continue, report failure at end
- **Dependency Chain Failure**: Stop execution of dependent items, report blocking failure
- **Circular Dependency**: Fail fast with clear error message and dependency cycle details
- **Missing Dependency**: Attempt to locate dependency in other scopes, fail if not found

**Recovery Options**:
- **Skip Failed Item**: Continue with remaining items (user confirmation required)
- **Retry Failed Item**: Attempt execution again after user fixes
- **Manual Override**: Mark failed item as complete (with warning) to unblock dependents

**Parallel Execution Examples**:
- **Independent Stories**: `email-validation.story.carl` and `password-strength.story.carl` can run simultaneously
- **Dependent Stories**: `database-schema.story.carl` must complete before `user-model.story.carl`
- **Mixed Dependencies**: Complete blocking stories first, then parallel execution of remaining stories