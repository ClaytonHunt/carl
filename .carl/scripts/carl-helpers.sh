#!/bin/bash

# CARL Helper Functions
# Core utility functions for CARL (Context-Aware Requirements Language) system

# Get CARL root directory
carl_get_root() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    echo "$(cd "$script_dir/../.." && pwd)"
}

# Configuration management
carl_get_json_value() {
    local json_file="$1"
    local key_path="$2"
    local default_value="$3"
    
    if [ ! -f "$json_file" ]; then
        echo "$default_value"
        return
    fi
    
    # Use python if available for reliable JSON parsing
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "
import json, sys
try:
    with open('$json_file') as f:
        data = json.load(f)
    keys = '$key_path'.split('.')
    value = data
    for key in keys:
        value = value.get(key, {})
    if value == {} or value is None:
        print('$default_value')
    else:
        print(value)
except:
    print('$default_value')
" 2>/dev/null
    else
        # Fallback to grep/sed for basic JSON parsing
        local value=$(grep -A 10 "\"$(echo "$key_path" | cut -d'.' -f1)\"" "$json_file" 2>/dev/null | 
                     grep "\"$(echo "$key_path" | cut -d'.' -f2)\"" | 
                     sed 's/.*".*":[[:space:]]*\(.*\)/\1/' | 
                     sed 's/[,}]$//' | 
                     sed 's/^[[:space:]]*"//' | 
                     sed 's/"[[:space:]]*$//')
        if [ -n "$value" ]; then
            echo "$value"
        else
            echo "$default_value"
        fi
    fi
}

carl_get_setting() {
    local setting="$1"
    local carl_root="$(carl_get_root)"
    local config_file="$carl_root/.carl/config/carl-settings.json"
    
    # Map old setting names to new JSON structure
    case "$setting" in
        "quiet_mode")
            carl_get_json_value "$config_file" "audio_settings.quiet_mode" "true"
            ;;
        "audio_enabled")
            carl_get_json_value "$config_file" "audio_settings.audio_enabled" "false"
            ;;
        "auto_update")
            carl_get_json_value "$config_file" "analysis_settings.auto_update_on_git_pull" "true"
            ;;
        "context_injection")
            carl_get_json_value "$config_file" "development_settings.auto_context_injection" "true"
            ;;
        "analysis_depth")
            # Map to comprehensive_scanning boolean as closest equivalent
            local comprehensive=$(carl_get_json_value "$config_file" "analysis_settings.comprehensive_scanning" "true")
            if [ "$comprehensive" = "true" ]; then
                echo "comprehensive"
            else
                echo "balanced"
            fi
            ;;
        "carl_persona")
            # This was related to audio/TTS, map to audio_enabled
            carl_get_json_value "$config_file" "audio_settings.audio_enabled" "false"
            ;;
        "volume_level")
            carl_get_json_value "$config_file" "audio_settings.volume_level" "75"
            ;;
        "quiet_hours_enabled")
            carl_get_json_value "$config_file" "audio_settings.quiet_hours_enabled" "false"
            ;;
        "quiet_hours_start")
            carl_get_json_value "$config_file" "audio_settings.quiet_hours_start" "22:00"
            ;;
        "quiet_hours_end")
            carl_get_json_value "$config_file" "audio_settings.quiet_hours_end" "08:00"
            ;;
        "personality_theme")
            carl_get_json_value "$config_file" "audio_settings.personality_theme" "jimmy_neutron"
            ;;
        "personality_response_style")
            carl_get_json_value "$config_file" "audio_settings.personality_response_style" "auto"
            ;;
        "session_tracking")
            carl_get_json_value "$config_file" "development_settings.session_tracking" "true"
            ;;
        "progress_monitoring")
            carl_get_json_value "$config_file" "development_settings.progress_monitoring" "true"
            ;;
        "parallel_analysis")
            carl_get_json_value "$config_file" "analysis_settings.parallel_analysis" "true"
            ;;
        "specialist_agents_enabled")
            carl_get_json_value "$config_file" "development_settings.specialist_agents_enabled" "true"
            ;;
        *) 
            echo "false"
            ;;
    esac
}

# Context management functions
carl_get_active_context() {
    local carl_root="$(carl_get_root)"
    local context=""
    
    # Load compact master process definition first for system consistency
    if [ -f "$carl_root/.carl/system/master.process.carl" ]; then
        context+="## CARL Master Process Context\n"
        context+="$(cat "$carl_root/.carl/system/master.process.carl")\n\n"
    fi
    
    # Add project vision for strategic AI context
    if [ -f "$carl_root/.carl/project/vision.carl" ]; then
        context+="$(carl_get_vision_context)\n"
    fi
    
    
    # CRITICAL: Add file structure rules to prevent AI deviations
    context+="## CRITICAL: CARL File Location Rules\n"
    context+="# NEVER create files in these locations:\n"
    context+="# ❌ .carl/system/specifications/ (WRONG)\n"
    context+="# ❌ .carl/intents/ (WRONG)\n"
    context+="# ❌ .carl/states/ (WRONG)\n"
    context+="# \n"
    context+="# ✅ ALWAYS use these exact paths:\n"
    context+="# ✅ Specifications: .carl/specs/*.carl\n"
    context+="# ✅ Intent files: .carl/project/{epics|features|stories|technical}/*.intent.carl\n"
    context+="# ✅ State files: .carl/project/{epics|features|stories|technical}/*.state.carl\n"
    context+="# ✅ Context files: .carl/project/{epics|features|stories|technical}/*.context.carl\n"
    context+="# \n"
    context+="# File Structure Specification Reference:\n"
    if [ -f "$carl_root/.carl/specs/project.structure.format.carl" ]; then
        context+="$(grep -A 15 'scope_directories:' "$carl_root/.carl/specs/project.structure.format.carl" 2>/dev/null)\n"
    fi
    context+="\n"

    # Add current process and workflow context
    if [ -f "$carl_root/.carl/process.carl" ]; then
        context+="## Current Process Context\n"
        context+="$(head -15 "$carl_root/.carl/process.carl")\n\n"
    fi
    
    # Add project-specific process context
    if [ -f "$carl_root/.carl/project/process.carl" ]; then
        context+="## Project Process Context\n"
        context+="$(head -15 "$carl_root/.carl/project/process.carl")\n\n"
    fi
    
    # Add active work context
    if [ -f "$carl_root/.carl/project/active.work.carl" ]; then
        context+="## Active Work Context\n"
        context+="$(head -25 "$carl_root/.carl/project/active.work.carl")\n\n"
    fi
    
    # Add current session context using new session manager
    local session_manager="$carl_root/.carl/scripts/carl-session-manager.sh"
    if [ -f "$session_manager" ]; then
        source "$session_manager"
        local session_context="$(carl_get_session_context)"
        if [ -n "$session_context" ]; then
            context+="$session_context\n"
        fi
    fi
    
    # Add recent CARL file updates (top 5 most recent) - updated file extensions
    local recent_files=$(find "$carl_root/.carl/project" -name "*.intent.carl" -o -name "*.state.carl" -o -name "*.context.carl" 2>/dev/null | xargs ls -t 2>/dev/null | head -5)
    if [ -n "$recent_files" ]; then
        context+="## Recently Updated CARL Files\n"
        echo "$recent_files" | while read file; do
            if [ -f "$file" ]; then
                local filename=$(basename "$file")
                context+="### $filename\n"
                context+="$(head -10 "$file")\n\n"
            fi
        done
    fi
    
    echo -e "$context"
}

carl_get_targeted_context() {
    local prompt="$1"
    local carl_root="$(carl_get_root)"
    local context=""
    
    # Extract keywords from prompt to find relevant CARL files
    local keywords=$(echo "$prompt" | tr '[:upper:]' '[:lower:]' | grep -oE '\b[a-z]{3,}\b' | sort -u)
    local relevant_files=""
    
    # Search for CARL files matching keywords
    for keyword in $keywords; do
        local matches=$(find "$carl_root/.carl/project" -name "*$keyword*" -type f 2>/dev/null)
        relevant_files="$relevant_files $matches"
    done
    
    # Remove duplicates and get top 3 most relevant files
    relevant_files=$(echo "$relevant_files" | tr ' ' '\n' | sort -u | head -3)
    
    if [ -n "$relevant_files" ]; then
        context+="## Relevant CARL Context for: $(echo "$keywords" | head -3 | tr '\n' ' ')\n"
        echo "$relevant_files" | while read file; do
            if [ -f "$file" ]; then
                local filename=$(basename "$file")
                context+="### $filename\n"
                context+="$(head -15 "$file")\n\n"
            fi
        done
    fi
    
    echo -e "$context"
}

# Strategic context extraction functions
carl_extract_vision_essence() {
    local vision_file="$1"
    
    if [ ! -f "$vision_file" ]; then
        return 0
    fi
    
    # Extract only the core vision elements (not full template)
    {
        grep -A 2 "mission_statement:" "$vision_file" 2>/dev/null | grep -v "^--$"
        grep -A 3 "value_proposition:" "$vision_file" 2>/dev/null | grep -v "^--$"
        grep -A 2 "target_impact:" "$vision_file" 2>/dev/null | grep -v "^--$"
    } | head -15
}

carl_extract_roadmap_current_context() {
    local roadmap_file="$1"
    
    if [ ! -f "$roadmap_file" ]; then
        return 0
    fi
    
    # Extract only current phase + immediate next steps
    {
        grep -A 10 "current_focus:" "$roadmap_file" 2>/dev/null | grep -v "^--$"
        grep -A 5 "active_phase:" "$roadmap_file" 2>/dev/null | grep -v "^--$"
        grep -A 3 "immediate_actions:" "$roadmap_file" 2>/dev/null | grep -v "^--$"
    } | head -20
}

carl_extract_recent_strategic_decisions() {
    local decisions_file="$1"
    local count="${2:-3}"
    
    if [ ! -f "$decisions_file" ]; then
        return 0
    fi
    
    # Get only recent accepted decisions (not entire history)
    grep -B 1 -A 8 "status: accepted" "$decisions_file" 2>/dev/null | grep -v "^--$" | tail -n $((count * 10))
}

carl_get_strategic_context() {
    local prompt="$1"
    local carl_root="$(carl_get_root)"
    local context=""
    
    # Determine context depth needed based on prompt content
    if echo "$prompt" | grep -qE "/carl:plan|/carl:analyze|major|strategic|roadmap|vision|decision"; then
        # DEEP CONTEXT - for planning and analysis commands
        context+="## Vision Context\n"
        context+="$(carl_get_vision_context)\n\n"
        
        context+="## Current Roadmap Phase\n" 
        context+="$(carl_extract_roadmap_current_context "$carl_root/.carl/project/roadmap.carl")\n\n"
        
        context+="## Recent Strategic Decisions\n"
        context+="$(carl_extract_recent_strategic_decisions "$carl_root/.carl/decisions.carl" 5)\n\n"
        
    elif echo "$prompt" | grep -qE "feature|requirement|priority|epic|story"; then
        # MEDIUM CONTEXT - for feature work
        context+="## Current Focus\n"
        context+="$(carl_extract_roadmap_current_context "$carl_root/.carl/project/roadmap.carl")\n\n"
        
        context+="## Vision Goals\n"
        context+="$(grep -A 3 'success_criteria:' "$carl_root/.carl/project/vision.carl" 2>/dev/null)\n\n"
        
    else
        # LIGHT CONTEXT - for general development
        context+="## Current Priority\n"
        context+="$(grep -A 5 'current_focus:' "$carl_root/.carl/project/roadmap.carl" 2>/dev/null)\n\n"
    fi
    
    echo -e "$context"
}

carl_get_alignment_validation_context() {
    local prompt="$1"
    local carl_root="$(carl_get_root)"
    local context=""
    
    # Check if project has vision file
    local vision_file="$carl_root/.carl/project/vision.carl"
    if [ ! -f "$vision_file" ]; then
        return 0
    fi
    
    # Detect planning-related context and provide alignment validation instructions
    if echo "$prompt" | grep -qiE "/carl:plan|feature|implement|create|build|add|new.*functionality"; then
        context+="## Strategic Alignment Validation\n"
        context+="Project has a defined strategic vision. During planning:\n\n"
        
        # Extract project mission/purpose for alignment checking
        context+="### Project Purpose (from vision):\n"
        context+="$(python3 -c "
import yaml, sys
try:
    with open('$vision_file', 'r') as f:
        data = yaml.safe_load(f)
    if 'project_identity' in data:
        mission = data['project_identity'].get('mission', '')
        if mission:
            print(f'Mission: {mission}')
        value_prop = data['project_identity'].get('value_proposition', '')
        if value_prop:
            print(f'Value Proposition: {value_prop}')
    print()
    print('IMPORTANT: Validate that planned features align with this project purpose.')
    print('If a feature seems unrelated, ask user to confirm this is intentional.')
except Exception as e:
    print('Project vision available - validate feature alignment during planning.')
" 2>/dev/null || echo "Project vision available - validate feature alignment during planning.")\n\n"
        
        # Add validation instructions
        context+="### Validation Instructions:\n"
        context+="- Check if requested features align with project mission\n"
        context+="- Question features that seem unrelated (e.g., 'garden shed design' for finance app)\n"
        context+="- Ask for confirmation if misalignment detected\n"
        context+="- Allow user to proceed after explicit confirmation\n\n"
    fi
    
    echo -e "$context"
}

# Feedback and Guidance System Functions
carl_generate_alignment_recommendations() {
    local feature_description="$1"
    local alignment_scores="$2"  # JSON string with score breakdown
    local user_role="${3:-developer}"
    local carl_root="$(carl_get_root)"
    
    # Parse alignment scores and generate recommendations
    python3 -c "
import json, yaml, sys
from pathlib import Path

def generate_recommendations(feature_desc, scores_json, role):
    try:
        scores = json.loads(scores_json) if scores_json else {}
        
        recommendations = {
            'actionable_steps': [],
            'strategic_insights': [],
            'role_specific_guidance': [],
            'improvement_priority': 'medium'
        }
        
        # Role-specific guidance generation
        if role == 'developer':
            recommendations['role_specific_guidance'].extend([
                'Focus on technical architecture alignment and implementation quality',
                'Consider how feature integrates with existing system components',
                'Ensure proper testing and documentation for strategic features'
            ])
        elif role == 'product_owner':
            recommendations['role_specific_guidance'].extend([
                'Evaluate business value alignment with strategic objectives',
                'Consider stakeholder impact and user experience implications',
                'Assess feature priority relative to roadmap commitments'
            ])
        elif role == 'strategic_decision_maker':
            recommendations['role_specific_guidance'].extend([
                'Review strategic coherence with long-term vision',
                'Evaluate resource allocation impact and opportunity cost',
                'Consider market positioning and competitive implications'
            ])
        
        # Generate actionable recommendations based on scores
        if 'business_value' in scores and scores['business_value'] < 70:
            recommendations['actionable_steps'].append(
                'Strengthen business value proposition by clearly defining user benefits and measurable outcomes'
            )
        
        if 'strategic_coherence' in scores and scores['strategic_coherence'] < 70:
            recommendations['actionable_steps'].append(
                'Improve strategic alignment by connecting feature to specific strategic objectives'
            )
        
        if 'technical_architecture' in scores and scores['technical_architecture'] < 70:
            recommendations['actionable_steps'].append(
                'Enhance technical integration by ensuring compatibility with existing architecture'
            )
        
        if 'resource_constraints' in scores and scores['resource_constraints'] < 70:
            recommendations['actionable_steps'].append(
                'Optimize resource requirements by reducing scope or identifying efficiency opportunities'
            )
        
        if 'risk_factors' in scores and scores['risk_factors'] < 70:
            recommendations['actionable_steps'].append(
                'Mitigate identified risks through contingency planning and risk reduction strategies'
            )
        
        # Strategic insights
        total_score = sum(scores.values()) / len(scores) if scores else 50
        if total_score >= 80:
            recommendations['improvement_priority'] = 'low'
            recommendations['strategic_insights'].append('Feature shows strong strategic alignment - proceed with confidence')
        elif total_score >= 60:
            recommendations['improvement_priority'] = 'medium'
            recommendations['strategic_insights'].append('Feature has good foundation - address specific alignment gaps')
        else:
            recommendations['improvement_priority'] = 'high'
            recommendations['strategic_insights'].append('Feature needs significant alignment improvement before implementation')
        
        return recommendations
        
    except Exception as e:
        return {'error': f'Recommendation generation failed: {str(e)}'}

# Main execution
feature_desc = '''$feature_description'''
scores_json = '''$alignment_scores'''
role = '''$user_role'''

result = generate_recommendations(feature_desc, scores_json, role)
print(json.dumps(result, indent=2))
" 2>/dev/null || echo '{"error": "Python recommendation engine unavailable"}'
}

carl_format_guidance_output() {
    local recommendations_json="$1"
    local format="${2:-detailed}"
    
    python3 -c "
import json, sys

def format_guidance(recommendations_json, format_type):
    try:
        data = json.loads(recommendations_json)
        
        if 'error' in data:
            return f'Guidance generation error: {data[\"error\"]}'
        
        output = []
        
        if format_type == 'summary':
            output.append('## Alignment Guidance Summary')
            output.append(f'Priority: {data.get(\"improvement_priority\", \"medium\").upper()}')
            if data.get('strategic_insights'):
                output.append(f'Key Insight: {data[\"strategic_insights\"][0]}')
        
        elif format_type == 'detailed':
            output.append('## Strategic Alignment Recommendations')
            output.append('')
            
            if data.get('strategic_insights'):
                output.append('### Strategic Assessment:')
                for insight in data['strategic_insights']:
                    output.append(f'- {insight}')
                output.append('')
            
            if data.get('actionable_steps'):
                output.append('### Actionable Improvements:')
                for i, step in enumerate(data['actionable_steps'], 1):
                    output.append(f'{i}. {step}')
                output.append('')
            
            if data.get('role_specific_guidance'):
                output.append('### Role-Specific Guidance:')
                for guidance in data['role_specific_guidance']:
                    output.append(f'- {guidance}')
                output.append('')
        
        elif format_type == 'executive':
            output.append('## Executive Alignment Summary')
            output.append(f'**Priority:** {data.get(\"improvement_priority\", \"medium\").upper()}')
            if data.get('strategic_insights'):
                output.append(f'**Assessment:** {data[\"strategic_insights\"][0]}')
            action_count = len(data.get('actionable_steps', []))
            if action_count > 0:
                output.append(f'**Actions Required:** {action_count} strategic improvements identified')
        
        return '\\n'.join(output)
        
    except Exception as e:
        return f'Format error: {str(e)}'

# Main execution
recommendations_json = '''$recommendations_json'''
format_type = '''$format'''

result = format_guidance(recommendations_json, format_type)
print(result)
" 2>/dev/null || echo "Guidance formatting unavailable"
}

carl_analyze_strategic_gaps() {
    local carl_root="$(carl_get_root)"
    local context_file="$1"  # Optional specific context file
    
    python3 -c "
import os, yaml, json, glob
from pathlib import Path

def analyze_gaps(carl_root, context_file=None):
    try:
        gaps = {
            'systematic_issues': [],
            'improvement_pathways': [],
            'trend_analysis': {},
            'recommendations': []
        }
        
        # Load project vision for gap analysis
        vision_file = Path(carl_root) / '.carl' / 'project' / 'vision.carl'
        if not vision_file.exists():
            return {'error': 'Project vision file not found for gap analysis'}
        
        with open(vision_file, 'r') as f:
            vision_data = yaml.safe_load(f)
        
        # Analyze pattern across feature files
        feature_files = glob.glob(f'{carl_root}/.carl/project/features/*.intent.carl')
        alignment_patterns = {}
        
        for feature_file in feature_files:
            try:
                with open(feature_file, 'r') as f:
                    # Simple pattern analysis - could be enhanced
                    content = f.read()
                    if 'business_value' in content:
                        alignment_patterns.setdefault('has_business_value', 0)
                        alignment_patterns['has_business_value'] += 1
                    if 'strategic_coherence' in content:
                        alignment_patterns.setdefault('has_strategic_coherence', 0) 
                        alignment_patterns['has_strategic_coherence'] += 1
            except Exception:
                continue
        
        # Generate gap insights
        total_features = len(feature_files)
        if total_features > 0:
            if alignment_patterns.get('has_business_value', 0) / total_features < 0.8:
                gaps['systematic_issues'].append('Many features lack clear business value definition')
                gaps['improvement_pathways'].append('Implement business value assessment templates')
            
            if alignment_patterns.get('has_strategic_coherence', 0) / total_features < 0.8:
                gaps['systematic_issues'].append('Strategic coherence documentation is inconsistent')
                gaps['improvement_pathways'].append('Develop strategic coherence validation checklist')
        
        # Generate recommendations
        if gaps['systematic_issues']:
            gaps['recommendations'].append('Focus on systematic alignment process improvements')
            gaps['recommendations'].append('Consider strategic planning workshop for alignment clarity')
        
        gaps['trend_analysis'] = {
            'total_features_analyzed': total_features,
            'alignment_coverage': f'{len(alignment_patterns) * 10}%'  # Simplified metric
        }
        
        return gaps
        
    except Exception as e:
        return {'error': f'Gap analysis failed: {str(e)}'}

# Main execution
carl_root = '''$carl_root'''
context_file = '''$context_file''' if '''$context_file''' else None

result = analyze_gaps(carl_root, context_file)
print(json.dumps(result, indent=2))
" 2>/dev/null || echo '{"error": "Strategic gap analysis unavailable"}'
}

carl_get_guidance_for_context() {
    local context="$1"
    local user_role="${2:-developer}"
    local guidance_type="${3:-actionable}"
    
    # Generate contextual guidance based on current situation
    case "$guidance_type" in
        "pivot_detected")
            echo "## Strategic Pivot Detected
            
This change appears to represent a strategic direction shift rather than feature misalignment.

### Recommended Actions:
1. **Stakeholder Review**: Schedule strategic review with key stakeholders
2. **Vision Update**: Consider updating project vision to reflect new direction  
3. **Impact Assessment**: Evaluate implications for existing roadmap and features
4. **Communication**: Ensure team alignment on strategic direction change

### Questions to Consider:
- Does this pivot align with market conditions or user feedback?
- What existing features might need reevaluation under new direction?
- How does this affect resource allocation and timeline commitments?"
            ;;
        "alignment_low")
            echo "## Low Alignment Detected

This feature shows weak strategic alignment across multiple dimensions.

### Immediate Actions:
1. **Requirements Review**: Clarify feature purpose and business justification
2. **Stakeholder Input**: Gather additional context from business stakeholders
3. **Scope Refinement**: Consider reducing scope to improve alignment
4. **Alternative Approaches**: Explore different implementation strategies

### Focus Areas:
- Strengthen connection to strategic objectives
- Clarify measurable business value
- Ensure technical architecture compatibility"
            ;;
        "actionable"|*)
            echo "## Strategic Alignment Guidance

Use alignment validation results to improve feature strategic value.

### General Best Practices:
1. **Business Value**: Connect every feature to measurable user or business outcomes
2. **Strategic Coherence**: Ensure features advance core strategic objectives
3. **Technical Integration**: Design for compatibility with existing architecture
4. **Resource Optimization**: Balance feature scope with available resources
5. **Risk Management**: Identify and mitigate potential implementation risks"
            ;;
    esac
}

# Vision Discovery and Template System Functions
carl_discover_or_create_project_vision() {
    local carl_root="$(carl_get_root)"
    local vision_file="$carl_root/.carl/project/vision.carl"
    
    # Check if vision already exists
    if [ -f "$vision_file" ]; then
        echo "Project vision already exists at: $vision_file"
        return 0
    fi
    
    echo "## Project Vision Discovery"
    echo
    echo "No project vision found. Let me help you create one through discovery..."
    echo
    
    # Try to extract vision from existing documentation
    local readme_files=$(find "$carl_root" -maxdepth 2 -name "README*" -o -name "readme*" 2>/dev/null)
    local package_files=$(find "$carl_root" -maxdepth 2 -name "package.json" -o -name "Cargo.toml" -o -name "pom.xml" 2>/dev/null)
    
    if [ -n "$readme_files" ] || [ -n "$package_files" ]; then
        echo "**Found existing project documentation. Analyzing...**"
        echo
        
        # Extract basic project info
        local project_name=""
        local project_description=""
        
        # Try to get project name and description from package files
        if [ -n "$package_files" ]; then
            for file in $package_files; do
                if [[ "$file" == *"package.json" ]]; then
                    project_name=$(grep '"name"' "$file" 2>/dev/null | sed 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
                    project_description=$(grep '"description"' "$file" 2>/dev/null | sed 's/.*"description"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
                    break
                fi
            done
        fi
        
        # If we found some info, use it as a starting point
        if [ -n "$project_name" ] || [ -n "$project_description" ]; then
            echo "**Extracted Project Information:**"
            [ -n "$project_name" ] && echo "- Name: $project_name"
            [ -n "$project_description" ] && echo "- Description: $project_description"
            echo
        fi
    fi
    
    # Start discovery session
    echo "**Starting Vision Discovery Session**"
    echo
    echo "I'll ask you a few questions to understand your project's purpose and goals."
    echo "This will help create a strategic vision for alignment validation."
    echo
    
    # Ask key discovery questions
    carl_ask_vision_discovery_questions
}

carl_ask_vision_discovery_questions() {
    echo "## Vision Discovery Questions"
    echo
    echo "Please help me understand your project by answering these questions:"
    echo
    echo "### 1. Project Purpose"
    echo "**What problem does your project solve?** (Be specific about the user problem)"
    echo
    echo "### 2. Target Users"
    echo "**Who are your primary users?** (Be specific about user types, not just 'developers' or 'users')"
    echo
    echo "### 3. Value Proposition"
    echo "**What makes your solution unique or valuable?** (How is it different from alternatives?)"
    echo
    echo "### 4. Project Type"
    echo "**What type of project is this?**"
    echo "- Startup/MVP (market validation focus)"
    echo "- Enterprise application (compliance, integration focus)"
    echo "- Open source tool (community, adoption focus)"
    echo "- Internal tool (efficiency, productivity focus)"
    echo "- Other (please specify)"
    echo
    echo "### 5. Success Metrics"
    echo "**How will you measure success?** (What does 'done' or 'successful' look like?)"
    echo
    echo "---"
    echo
    echo "**Next Steps:**"
    echo "After you provide these answers, I'll:"
    echo "1. Generate a project vision file based on your responses"
    echo "2. Choose an appropriate template for your project type"
    echo "3. Enable strategic alignment validation for future feature planning"
    echo
    echo "**To continue:** Please answer the questions above, then ask me to create the vision based on your responses."
}

# Vision Template System Functions
carl_list_available_vision_templates() {
    local carl_root="$(carl_get_root)"
    local templates_dir="$carl_root/.carl/templates/vision"
    
    if [ ! -d "$templates_dir" ]; then
        echo "No vision templates found"
        return 1
    fi
    
    echo "## Available Vision Templates"
    echo
    
    for template_file in "$templates_dir"/*.vision.template.carl; do
        if [ -f "$template_file" ]; then
            local template_name=$(basename "$template_file" .vision.template.carl)
            local template_type=$(grep "template_type:" "$template_file" | head -1 | sed 's/.*template_type: *"\([^"]*\)".*/\1/')
            local strategic_focus=$(grep "strategic_focus:" "$template_file" | head -1 | sed 's/.*strategic_focus: *\[\([^\]]*\)\].*/\1/' | sed 's/"//g')
            local recommended_for=$(grep "recommended_for:" "$template_file" | head -1 | sed 's/.*recommended_for: *\[\([^\]]*\)\].*/\1/' | sed 's/"//g')
            
            echo "### $template_name"
            echo "**Type**: $template_type"
            echo "**Focus**: $strategic_focus"
            echo "**Recommended for**: $recommended_for"
            echo
        fi
    done
}

carl_recommend_vision_template() {
    local project_size="${1:-unknown}"
    local project_domain="${2:-unknown}"
    local strategic_context="${3:-unknown}"
    local stakeholder_complexity="${4:-unknown}"
    
    echo "## Vision Template Recommendation"
    echo
    echo "Based on your project characteristics:"
    echo "- **Project Size**: $project_size"
    echo "- **Project Domain**: $project_domain"
    echo "- **Strategic Context**: $strategic_context"
    echo "- **Stakeholder Complexity**: $stakeholder_complexity"
    echo
    
    # Simple recommendation logic
    if [[ "$strategic_context" == "startup" || "$project_size" == "individual" || "$project_size" == "small_team" ]]; then
        echo "**Recommended Template**: startup-project"
        echo "**Rationale**: Early-stage projects benefit from focus on market validation and rapid iteration"
        echo
        echo "**Alternative**: open-source-project (if building community-focused tool)"
        
    elif [[ "$project_domain" == "enterprise" || "$stakeholder_complexity" == "multi_stakeholder" || "$strategic_context" == "maturity" ]]; then
        echo "**Recommended Template**: enterprise-project"
        echo "**Rationale**: Complex organizational contexts require emphasis on compliance and integration"
        echo
        echo "**Alternative**: startup-project (if internal innovation project)"
        
    elif [[ "$project_domain" == "developer" || "$project_domain" == "platform" ]]; then
        echo "**Recommended Template**: open-source-project"
        echo "**Rationale**: Developer-focused projects benefit from community adoption strategies"
        echo
        echo "**Alternative**: enterprise-project (if internal developer platform)"
        
    else
        echo "**Recommended Template**: startup-project"
        echo "**Rationale**: General-purpose template suitable for most projects"
        echo
        echo "**Alternatives**:"
        echo "- enterprise-project (for complex organizational requirements)"
        echo "- open-source-project (for community-driven development)"
    fi
    
    echo
    echo "**Next Steps**:"
    echo "1. Review recommended template: \`carl_preview_vision_template [template_name]\`"
    echo "2. Create project vision: \`carl_create_vision_from_template [template_name]\`"
    echo "3. Complete template with project-specific details"
}

carl_preview_vision_template() {
    local template_name="$1"
    local carl_root="$(carl_get_root)"
    local template_file="$carl_root/.carl/templates/vision/${template_name}.vision.template.carl"
    
    if [ ! -f "$template_file" ]; then
        echo "Template not found: $template_name"
        return 1
    fi
    
    echo "## Vision Template Preview: $template_name"
    echo
    
    # Extract template metadata
    local template_type=$(grep "template_type:" "$template_file" | head -1 | sed 's/.*template_type: *"\([^"]*\)".*/\1/')
    local strategic_focus=$(grep "strategic_focus:" "$template_file" | head -1 | sed 's/.*strategic_focus: *\[\([^\]]*\)\].*/\1/' | sed 's/"//g')
    local project_characteristics=$(grep "project_characteristics:" "$template_file" | head -1 | sed 's/.*project_characteristics: *\[\([^\]]*\)\].*/\1/' | sed 's/"//g')
    
    echo "**Template Type**: $template_type"
    echo "**Strategic Focus**: $strategic_focus"
    echo "**Project Characteristics**: $project_characteristics"
    echo
    
    # Show template structure
    echo "**Template Structure**:"
    grep "^# \|^[a-z_]*:" "$template_file" | grep -v "^#.*Help:" | head -20
    echo "... (see full template for complete structure)"
    echo
    
    # Show completion guide
    echo "**Completion Guide**:"
    sed -n '/completion_guide:/,/template_notes:/p' "$template_file" | grep -A 10 "getting_started:" | head -10
    echo
    
    echo "**To use this template**: \`carl_create_vision_from_template $template_name\`"
}

carl_create_vision_from_template() {
    local template_name="$1"
    local carl_root="$(carl_get_root)"
    local template_file="$carl_root/.carl/templates/vision/${template_name}.vision.template.carl"
    local target_file="$carl_root/.carl/project/vision.carl"
    
    if [ ! -f "$template_file" ]; then
        echo "Template not found: $template_name"
        echo "Available templates:"
        carl_list_available_vision_templates
        return 1
    fi
    
    if [ -f "$target_file" ]; then
        echo "Project vision file already exists: $target_file"
        echo "Would you like to backup the existing file and create a new one? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            mv "$target_file" "$target_file.backup.$(date +%Y%m%d_%H%M%S)"
            echo "Existing vision file backed up"
        else
            echo "Operation cancelled"
            return 1
        fi
    fi
    
    # Copy template to project vision file
    cp "$template_file" "$target_file"
    
    echo "## Vision Template Created Successfully"
    echo
    echo "**Template**: $template_name"
    echo "**Location**: $target_file"
    echo
    echo "**Next Steps**:"
    echo "1. **Edit the vision file**: Replace all [PLACEHOLDER] text with your project details"
    echo "2. **Validate completeness**: Run \`carl_validate_vision_template\` to check for missing fields"
    echo "3. **Test alignment**: Run \`carl_validate_feature_alignment \"test feature\" \` to test the alignment system"
    echo
    echo "**Important**: Focus on being specific rather than generic - avoid buzzwords and use measurable criteria"
    
    # Show immediate next actions
    echo
    echo "**Template Completion Checklist**:"
    echo "- [ ] Replace project identity placeholders with specific details"
    echo "- [ ] Define 3-5 strategic objectives with measurable success metrics"
    echo "- [ ] Customize alignment criteria weights for your project context"
    echo "- [ ] Specify target stakeholders and users"
    echo "- [ ] Set realistic and measurable success criteria"
    echo "- [ ] Complete risk assessment for your specific context"
}

carl_validate_vision_template() {
    local carl_root="$(carl_get_root)"
    local vision_file="$carl_root/.carl/project/vision.carl"
    
    if [ ! -f "$vision_file" ]; then
        echo "No project vision file found at: $vision_file"
        echo "Create one using: carl_create_vision_from_template [template_name]"
        return 1
    fi
    
    echo "## Vision Template Validation"
    echo
    
    local validation_errors=0
    local validation_warnings=0
    
    # Check for placeholder text
    local placeholders=$(grep -n "\[.*\]" "$vision_file" | head -10)
    if [ -n "$placeholders" ]; then
        echo "**❌ Incomplete Fields Found**:"
        echo "$placeholders"
        echo
        validation_errors=$((validation_errors + 1))
    else
        echo "**✅ All placeholder fields completed**"
        echo
    fi
    
    # Validate alignment criteria weights
    local weight_validation=$(carl_validate_project_vision 2>/dev/null | grep -i "weight")
    if echo "$weight_validation" | grep -q "must sum to 1.0"; then
        echo "**❌ Alignment Criteria Weights Issue**:"
        echo "$weight_validation"
        echo
        validation_errors=$((validation_errors + 1))
    else
        echo "**✅ Alignment criteria weights are valid**"
        echo
    fi
    
    # Check for required sections
    local required_sections=("project_identity" "strategic_objectives" "alignment_criteria" "stakeholders" "success_criteria")
    for section in "${required_sections[@]}"; do
        if grep -q "^$section:" "$vision_file"; then
            echo "**✅ Required section present**: $section"
        else
            echo "**❌ Missing required section**: $section"
            validation_errors=$((validation_errors + 1))
        fi
    done
    echo
    
    # Summary
    if [ $validation_errors -eq 0 ]; then
        echo "**🎉 Vision Template Validation Passed**"
        echo "Your project vision is ready for use with the alignment system!"
        echo
        echo "**Test the alignment system**: \`carl_validate_feature_alignment \"sample feature description\"\`"
    else
        echo "**⚠️ Vision Template Validation Failed**"
        echo "Found $validation_errors error(s) that need to be addressed."
        echo
        echo "**Next Steps**:"
        echo "1. Address the validation errors listed above"
        echo "2. Run validation again: \`carl_validate_vision_template\`"
        echo "3. Once validation passes, test alignment: \`carl_validate_feature_alignment \"test feature\"\`"
    fi
    
    return $validation_errors
}

# State management functions
carl_update_state_from_changes() {
    local carl_root="$(carl_get_root)"
    
    # Get list of recently changed files
    local changed_files=$(git diff --name-only HEAD~1 2>/dev/null || echo "")
    
    if [ -z "$changed_files" ]; then
        return 0
    fi
    
    # Update relevant CARL state files based on changes
    echo "$changed_files" | while read file; do
        if [ -f "$file" ]; then
            carl_update_context_for_file "$file"
        fi
    done
}

carl_update_context_for_file() {
    local file_path="$1"
    local carl_root="$(carl_get_root)"
    
    # Determine which CARL files might be affected by this change
    local file_dir=$(dirname "$file_path")
    local file_name=$(basename "$file_path")
    
    # Look for related CARL files based on file path patterns
    local related_contexts=$(find "$carl_root/.carl/project" -name "*$(echo "$file_dir" | tr '/' '-')*" -o -name "*$(echo "$file_name" | cut -d'.' -f1)*" 2>/dev/null)
    
    # Update context files with change timestamp
    for context_file in $related_contexts; do
        if [ -f "$context_file" ]; then
            echo "# Updated: $(date -Iseconds) - File change detected: $file_path" >> "$context_file"
        fi
    done
}

# Session management functions
carl_save_session_state() {
    local carl_root="$(carl_get_root)"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local session_file="$carl_root/.carl/sessions/$timestamp.session"
    
    # Create session state file
    cat > "$session_file" << EOF
session_id: $timestamp
timestamp: $(date -Iseconds)
working_directory: $(pwd)
git_branch: $(git branch --show-current 2>/dev/null || echo "unknown")
git_commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")

active_features:
$(carl_get_active_features)

context_snapshot:
$(carl_get_active_context | head -20)
EOF
    
    # Update current session symlink
    ln -sf "$session_file" "$carl_root/.carl/sessions/current.session"
}

carl_get_active_features() {
    local carl_root="$(carl_get_root)"
    
    # Find intent files that indicate active features in new project structure
    find "$carl_root/.carl/project" -name "*.intent.carl" 2>/dev/null | while read intent_file; do
        if [ -f "$intent_file" ]; then
            local feature_id=$(basename "$intent_file" .intent.carl)
            local status=$(grep "^status:" "$intent_file" 2>/dev/null | cut -d':' -f2 | tr -d ' ')
            echo "  - id: $feature_id"
            echo "    status: ${status:-unknown}"
            echo "    file: $intent_file"
        fi
    done
}

# Activity logging functions
carl_log_activity() {
    local activity_type="$1"
    local tool_name="$2"
    local carl_root="$(carl_get_root)"
    local log_file="$carl_root/.carl/sessions/current.activity"
    
    echo "$(date -Iseconds) - $activity_type - $tool_name" >> "$log_file"
}

carl_log_milestone() {
    local milestone_type="$1"
    local description="$2"
    local carl_root="$(carl_get_root)"
    local milestone_file="$carl_root/.carl/sessions/current.milestones"
    
    echo "$(date -Iseconds) - $milestone_type - $description" >> "$milestone_file"
}

# Progress tracking functions
carl_get_session_activities() {
    local carl_root="$(carl_get_root)"
    local activity_file="$carl_root/.carl/sessions/current.activity"
    
    if [ -f "$activity_file" ]; then
        tail -10 "$activity_file" | cut -d'-' -f2- | sed 's/^ *//'
    fi
}

carl_get_session_milestones() {
    local carl_root="$(carl_get_root)"
    local milestone_file="$carl_root/.carl/sessions/current.milestones"
    
    if [ -f "$milestone_file" ]; then
        tail -5 "$milestone_file" | cut -d'-' -f2- | sed 's/^ *//'
    fi
}

carl_get_session_progress() {
    local carl_root="$(carl_get_root)"
    
    # Count activities and milestones for progress assessment
    local activities=$(carl_get_session_activities | wc -l)
    local milestones=$(carl_get_session_milestones | wc -l)
    local files_modified=$(carl_count_modified_files)
    
    echo "Activities completed: $activities"
    echo "Milestones achieved: $milestones" 
    echo "Files modified: $files_modified"
}

# Code change analysis functions
carl_count_modified_files() {
    local count=$(git diff --name-only HEAD~1 2>/dev/null | wc -l 2>/dev/null)
    if [ -z "$count" ]; then count="0"; fi
    # Sanitize to prevent multiline strings that break sed
    echo "$count" | head -1 | tr -d '\n\r' | grep -oE '[0-9]+' || echo "0"
}

carl_count_added_lines() {
    local lines=$(git diff --stat HEAD~1 2>/dev/null | tail -1 | grep -oE '[0-9]+ insertions?' | cut -d' ' -f1 2>/dev/null)
    if [ -z "$lines" ]; then lines="0"; fi
    # Sanitize to prevent multiline strings that break sed
    echo "$lines" | head -1 | tr -d '\n\r' | grep -oE '[0-9]+' || echo "0"
}

carl_count_removed_lines() {
    local lines=$(git diff --stat HEAD~1 2>/dev/null | tail -1 | grep -oE '[0-9]+ deletions?' | cut -d' ' -f1 2>/dev/null)
    if [ -z "$lines" ]; then lines="0"; fi
    # Sanitize to prevent multiline strings that break sed
    echo "$lines" | head -1 | tr -d '\n\r' | grep -oE '[0-9]+' || echo "0"
}

# Session duration calculation
carl_calculate_session_duration() {
    local carl_root="$(carl_get_root)"
    local current_session="$carl_root/.carl/sessions/current.session"
    
    if [ -f "$current_session" ]; then
        local start_time=$(grep "start_time:" "$current_session" 2>/dev/null | cut -d':' -f2- | tr -d ' ')
        if [ -n "$start_time" ]; then
            local start_epoch=$(date -d "$start_time" +%s 2>/dev/null || echo "0")
            local current_epoch=$(date +%s)
            local duration_seconds=$((current_epoch - start_epoch))
            
            if [ "$duration_seconds" -gt 3600 ]; then
                echo "$((duration_seconds / 3600))h $((duration_seconds % 3600 / 60))m"
            elif [ "$duration_seconds" -gt 60 ]; then
                echo "$((duration_seconds / 60))m"
            else
                echo "${duration_seconds}s"
            fi
        else
            echo "unknown"
        fi
    else
        echo "no session"
    fi
}

# Milestone detection and celebration
carl_check_and_celebrate_milestones() {
    local carl_root="$(carl_get_root)"
    
    # Check for common milestone patterns
    local files_modified=$(carl_count_modified_files)
    local lines_added=$(carl_count_added_lines)
    
    # Major code contribution milestone
    if [ "$files_modified" -ge 5 ] && [ "$lines_added" -ge 100 ]; then
        carl_log_milestone "major_contribution" "Modified $files_modified files, added $lines_added lines"
    fi
    
    # Check for test-related milestones
    if git log --oneline -1 2>/dev/null | grep -qi "test"; then
        carl_log_milestone "test_improvement" "Added or improved tests"
    fi
    
    # Check for feature completion patterns
    if git log --oneline -1 2>/dev/null | grep -qiE "complete|finish|done|implement"; then
        carl_log_milestone "feature_progress" "Feature implementation milestone"
    fi
}

# Recommendations generation
carl_generate_next_session_recommendations() {
    local carl_root="$(carl_get_root)"
    
    # Analyze current state to provide intelligent recommendations
    local modified_files=$(carl_count_modified_files)
    local recent_activities=$(carl_get_session_activities | wc -l)
    
    if [ "$modified_files" -gt 0 ]; then
        echo "• Run tests to validate recent code changes"
        echo "• Consider updating documentation for modified features"
    fi
    
    if [ "$recent_activities" -gt 5 ]; then
        echo "• Review and commit current changes before starting new work"
    fi
    
    # Check for incomplete work
    if find "$carl_root/.carl/project" -name "*.state.carl" -exec grep -l "in_progress" {} \; 2>/dev/null | head -1 > /dev/null; then
        echo "• Continue work on in-progress features tracked in CARL"
    fi
    
    echo "• Use /status to check overall project health"
    echo "• Use /analyze --sync to refresh CARL context if needed"
}

# Session management - Modern session tracking via carl-session-manager.sh
carl_update_session_data() {
    local carl_root="$(carl_get_root)"
    local session_manager="$carl_root/.carl/scripts/carl-session-manager.sh"
    
    # Use session manager for proper session tracking
    if [ -f "$session_manager" ]; then
        source "$session_manager"
        carl_update_session_metrics
    fi
}

# Update session activity tracking
carl_update_session_activity() {
    local tool="$1"
    local phase="$2"
    local carl_root="$(carl_get_root)"
    
    # Update current session with tool usage
    if [ -f "$carl_root/.carl/sessions/current.session" ]; then
        echo "tool_usage: $(date -Iseconds) - $tool ($phase)" >> "$carl_root/.carl/sessions/current.session"
    fi
}

# Progress metrics update
carl_update_progress_metrics() {
    local carl_root="$(carl_get_root)"
    
    # Update progress metrics based on current session data
    local metrics_file="$carl_root/.carl/sessions/current.metrics"
    
    cat > "$metrics_file" << EOF
timestamp: $(date -Iseconds)
files_modified: $(carl_count_modified_files)
lines_added: $(carl_count_added_lines)
lines_removed: $(carl_count_removed_lines)
activities_count: $(carl_get_session_activities | wc -l)
milestones_count: $(carl_get_session_milestones | wc -l)
session_duration: $(carl_calculate_session_duration)
EOF
}

# Test results tracking
carl_get_latest_test_results() {
    # Try to get latest test results from common test output patterns
    if [ -f "test-results.xml" ]; then
        echo "XML results available"
    elif git log --oneline -1 2>/dev/null | grep -qi "test"; then
        echo "Recent test-related commit"
    else
        echo ""
    fi
}

# Path validation functions for CARL file consistency enforcement
carl_validate_file_path() {
    local file_path="$1"
    local file_type="$2"
    
    # Define forbidden paths
    local forbidden_specs=(
        ".carl/system/specifications/"
        ".carl/specifications/"
    )
    
    local forbidden_intents=(
        ".carl/intents/"
        ".carl/project/intents/"
    )
    
    local forbidden_states=(
        ".carl/states/"
        ".carl/project/states/"
    )
    
    local forbidden_contexts=(
        ".carl/contexts/"
        ".carl/project/contexts/"
    )
    
    # Check for forbidden paths
    for forbidden in "${forbidden_specs[@]}"; do
        if [[ "$file_path" == *"$forbidden"* ]]; then
            echo "❌ ERROR: Invalid path '$file_path'"
            echo "   Use '.carl/specs/' instead of '$forbidden'"
            return 1
        fi
    done
    
    for forbidden in "${forbidden_intents[@]}"; do
        if [[ "$file_path" == *"$forbidden"* ]]; then
            echo "❌ ERROR: Invalid path '$file_path'"
            echo "   Use '.carl/project/{epics|features|stories|technical}/' instead"
            return 1
        fi
    done
    
    for forbidden in "${forbidden_states[@]}"; do
        if [[ "$file_path" == *"$forbidden"* ]]; then
            echo "❌ ERROR: Invalid path '$file_path'"
            echo "   Use '.carl/project/{epics|features|stories|technical}/' instead"
            return 1
        fi
    done
    
    for forbidden in "${forbidden_contexts[@]}"; do
        if [[ "$file_path" == *"$forbidden"* ]]; then
            echo "❌ ERROR: Invalid path '$file_path'"
            echo "   Use '.carl/project/{epics|features|stories|technical}/' instead"
            return 1
        fi
    done
    
    return 0
}

carl_suggest_correct_path() {
    local file_path="$1"
    local filename=$(basename "$file_path")
    
    if [[ "$filename" == *.intent.carl ]]; then
        echo "✅ Suggested path: .carl/project/technical/${filename}"
    elif [[ "$filename" == *.state.carl ]]; then
        echo "✅ Suggested path: .carl/project/technical/${filename}"
    elif [[ "$filename" == *.context.carl ]]; then
        echo "✅ Suggested path: .carl/project/technical/${filename}"
    elif [[ "$filename" == *.carl ]] && [[ "$filename" != *.intent.carl ]] && [[ "$filename" != *.state.carl ]]; then
        echo "✅ Suggested path: .carl/specs/${filename}"
    else
        echo "✅ Check CARL file structure specification"
    fi
}

carl_enforce_path_consistency() {
    local operation="$1"
    local file_path="$2"
    
    if ! carl_validate_file_path "$file_path"; then
        echo ""
        carl_suggest_correct_path "$file_path"
        echo ""
        echo "🔧 CARL Process Consistency Enforcement:"
        echo "   Files must be created in their designated locations"
        echo "   This ensures proper organization and AI context integration"
        return 1
    fi
    
    return 0
}

# Project Vision File Processing Functions
# AI-optimized vision file loading and alignment validation

carl_load_project_vision() {
    local carl_root="$(carl_get_root)"
    local vision_file="$carl_root/.carl/project/vision.carl"
    local cached_vision="/tmp/carl_vision_cache_$(basename "$carl_root")_$(stat -c %Y "$vision_file" 2>/dev/null || echo 0).json"
    
    # Return cached version if available and current
    if [ -f "$cached_vision" ] && [ -f "$vision_file" ]; then
        if [ "$cached_vision" -nt "$vision_file" ]; then
            cat "$cached_vision"
            return 0
        fi
    fi
    
    # Load and parse vision file if it exists
    if [ ! -f "$vision_file" ]; then
        echo "{\"error\": \"vision.carl not found\", \"path\": \"$vision_file\"}"
        return 1
    fi
    
    # Parse YAML to JSON for AI processing
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "
import yaml, json, sys
try:
    with open('$vision_file', 'r') as f:
        data = yaml.safe_load(f)
    json_output = json.dumps(data, indent=2)
    print(json_output)
    # Cache the result
    with open('$cached_vision', 'w') as f:
        f.write(json_output)
except Exception as e:
    print(json.dumps({'error': str(e), 'file': '$vision_file'}))
    sys.exit(1)
" 2>/dev/null
    else
        echo "{\"error\": \"Python3 required for YAML parsing\", \"file\": \"$vision_file\"}"
        return 1
    fi
}

carl_validate_project_vision() {
    local vision_file="$1"
    local carl_root="$(carl_get_root)"
    
    if [ -z "$vision_file" ]; then
        vision_file="$carl_root/.carl/project/vision.carl"
    fi
    
    if [ ! -f "$vision_file" ]; then
        echo "{\"valid\": false, \"error\": \"Vision file not found\", \"path\": \"$vision_file\"}"
        return 1
    fi
    
    # Validate YAML structure and required fields
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "
import yaml, json, sys

def validate_vision_file(file_path):
    try:
        with open(file_path, 'r') as f:
            data = yaml.safe_load(f)
    except Exception as e:
        return {'valid': False, 'error': f'YAML parsing error: {str(e)}'}
    
    errors = []
    warnings = []
    
    # Required sections validation
    required_sections = ['metadata', 'project_identity', 'strategic_objectives', 'alignment_criteria', 'stakeholders', 'constraints']
    for section in required_sections:
        if section not in data:
            errors.append(f'Missing required section: {section}')
    
    # Metadata validation
    if 'metadata' in data:
        required_metadata = ['id', 'version', 'created_date', 'last_updated']
        for field in required_metadata:
            if field not in data['metadata']:
                errors.append(f'Missing required metadata field: {field}')
    
    # Project identity validation
    if 'project_identity' in data:
        required_identity = ['name', 'description', 'core_value_proposition']
        for field in required_identity:
            if field not in data['project_identity']:
                errors.append(f'Missing required project_identity field: {field}')
    
    # Strategic objectives validation
    if 'strategic_objectives' in data:
        if not isinstance(data['strategic_objectives'], list) or len(data['strategic_objectives']) == 0:
            errors.append('strategic_objectives must be a non-empty array')
        else:
            for i, obj in enumerate(data['strategic_objectives']):
                required_obj_fields = ['objective_id', 'description', 'priority', 'success_metrics']
                for field in required_obj_fields:
                    if field not in obj:
                        errors.append(f'strategic_objectives[{i}] missing required field: {field}')
                
                # Priority range validation
                if 'priority' in obj and (not isinstance(obj['priority'], int) or obj['priority'] < 1 or obj['priority'] > 10):
                    errors.append(f'strategic_objectives[{i}].priority must be integer 1-10')
    
    # Alignment criteria validation
    if 'alignment_criteria' in data:
        required_criteria = ['business_value', 'strategic_coherence', 'technical_architecture', 'resource_constraints', 'risk_factors']
        total_weight = 0.0
        
        for criterion in required_criteria:
            if criterion not in data['alignment_criteria']:
                errors.append(f'Missing required alignment criterion: {criterion}')
            else:
                criterion_data = data['alignment_criteria'][criterion]
                if 'weight' not in criterion_data:
                    errors.append(f'alignment_criteria.{criterion} missing weight field')
                else:
                    weight = criterion_data['weight']
                    if not isinstance(weight, (int, float)) or weight < 0.0 or weight > 1.0:
                        errors.append(f'alignment_criteria.{criterion}.weight must be float 0.0-1.0')
                    else:
                        total_weight += weight
                
                if 'measurement_rules' not in criterion_data:
                    errors.append(f'alignment_criteria.{criterion} missing measurement_rules field')
                elif not isinstance(criterion_data['measurement_rules'], list) or len(criterion_data['measurement_rules']) == 0:
                    errors.append(f'alignment_criteria.{criterion}.measurement_rules must be non-empty array')
        
        # Weight sum validation
        if abs(total_weight - 1.0) > 0.01:
            errors.append(f'Alignment criteria weights must sum to 1.0 (current sum: {total_weight:.3f})')
    
    # Stakeholders validation
    if 'stakeholders' in data:
        if 'primary_users' not in data['stakeholders']:
            errors.append('stakeholders.primary_users is required')
        elif not isinstance(data['stakeholders']['primary_users'], list) or len(data['stakeholders']['primary_users']) == 0:
            errors.append('stakeholders.primary_users must be non-empty array')
    
    # Cross-reference validation
    if 'cross_references' in data:
        cross_refs = data['cross_references']
        for ref_type, ref_path in cross_refs.items():
            if ref_path and not ref_path.startswith('.carl/'):
                warnings.append(f'cross_references.{ref_type} should reference CARL files (.carl/ path)')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'sections_found': list(data.keys()) if 'data' in locals() else []
    }

result = validate_vision_file('$vision_file')
print(json.dumps(result, indent=2))
" 2>/dev/null
    else
        echo "{\"valid\": false, \"error\": \"Python3 required for vision validation\"}"
        return 1
    fi
}

carl_validate_feature_alignment() {
    local feature_description="$1"
    local context_data="$2"
    local carl_root="$(carl_get_root)"
    local vision_file="$carl_root/.carl/project/vision.carl"
    
    if [ -z "$feature_description" ]; then
        echo "{\"error\": \"Feature description required for alignment validation\"}"
        return 1
    fi
    
    # Load project vision
    local vision_data=$(carl_load_project_vision)
    if [ $? -ne 0 ]; then
        echo "{\"error\": \"Could not load project vision for alignment validation\"}"
        return 1
    fi
    
    # AI-optimized alignment scoring
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "
import json, re, sys
from datetime import datetime

def calculate_alignment_score(feature_desc, vision_data):
    try:
        vision = json.loads('''$vision_data''')
    except:
        return {'error': 'Invalid vision data format'}
    
    if 'alignment_criteria' not in vision:
        return {'error': 'No alignment criteria found in vision file'}
    
    criteria = vision['alignment_criteria']
    feature_lower = '''$feature_description'''.lower()
    
    # AI-optimized keyword analysis for each dimension
    dimension_scores = {}
    
    # Business Value Analysis
    business_keywords = ['revenue', 'cost', 'user', 'customer', 'satisfaction', 'value', 'profit', 'roi', 'market', 'competitive']
    business_score = sum(1 for kw in business_keywords if kw in feature_lower) / len(business_keywords)
    dimension_scores['business_value'] = min(business_score * 2, 1.0)  # Scale to 0-1
    
    # Strategic Coherence Analysis
    strategic_keywords = ['vision', 'mission', 'goal', 'strategy', 'objective', 'roadmap', 'direction', 'purpose']
    strategic_score = sum(1 for kw in strategic_keywords if kw in feature_lower) / len(strategic_keywords)
    dimension_scores['strategic_coherence'] = min(strategic_score * 2, 1.0)
    
    # Technical Architecture Analysis
    technical_keywords = ['architecture', 'system', 'integration', 'scalable', 'performance', 'security', 'api', 'database']
    technical_score = sum(1 for kw in technical_keywords if kw in feature_lower) / len(technical_keywords)
    dimension_scores['technical_architecture'] = min(technical_score * 2, 1.0)
    
    # Resource Constraints Analysis
    resource_keywords = ['time', 'budget', 'team', 'resource', 'capacity', 'timeline', 'effort', 'cost']
    resource_score = sum(1 for kw in resource_keywords if kw in feature_lower) / len(resource_keywords)
    dimension_scores['resource_constraints'] = min(resource_score * 2, 1.0)
    
    # Risk Factors Analysis
    risk_keywords = ['risk', 'security', 'compliance', 'vulnerability', 'safe', 'audit', 'regulation']
    risk_score = sum(1 for kw in risk_keywords if kw in feature_lower) / len(risk_keywords)
    dimension_scores['risk_factors'] = min(risk_score * 2, 1.0)
    
    # Calculate weighted overall score
    overall_score = 0.0
    dimension_breakdown = {}
    
    for dimension, weight_data in criteria.items():
        if dimension in dimension_scores:
            weight = weight_data.get('weight', 0.2)  # Default equal weight
            score = dimension_scores[dimension]
            weighted_score = score * weight
            overall_score += weighted_score
            
            dimension_breakdown[dimension] = {
                'score': round(score, 3),
                'weight': weight,
                'weighted_score': round(weighted_score, 3),
                'explanation': f'Keyword match analysis: {score:.1%} relevance'
            }
    
    # AI recommendations based on score
    recommendations = []
    if overall_score < 0.3:
        recommendations.append('Feature alignment is low - consider reviewing strategic fit')
        recommendations.append('Clarify business value and strategic objectives')
    elif overall_score < 0.7:
        recommendations.append('Moderate alignment - consider strengthening strategic coherence')
        recommendations.append('Review resource requirements and risk factors')
    else:
        recommendations.append('Strong alignment with project vision')
        recommendations.append('Proceed with detailed planning and implementation')
    
    # Pivot detection
    is_pivot = overall_score < 0.3 and any(score > 0.5 for score in dimension_scores.values())
    
    return {
        'overall_alignment_score': round(overall_score, 3),
        'dimension_breakdown': dimension_breakdown,
        'ai_recommendations': recommendations,
        'validation_metadata': {
            'scoring_confidence': 0.8,  # AI keyword analysis confidence
            'missing_context_flags': [],
            'calibration_notes': 'Keyword-based scoring - requires human validation for complex features',
            'is_potential_pivot': is_pivot,
            'timestamp': datetime.now().isoformat()
        }
    }

result = calculate_alignment_score('''$feature_description''', '''$vision_data''')
print(json.dumps(result, indent=2))
" 2>/dev/null
    else
        echo "{\"error\": \"Python3 required for alignment validation\"}"
        return 1
    fi
}

carl_validate_feature_alignment_with_guidance() {
    local feature_description="$1"
    local context_data="$2"
    local user_role="${3:-developer}"
    local guidance_format="${4:-detailed}"
    
    # Get basic alignment validation
    local alignment_result=$(carl_validate_feature_alignment "$feature_description" "$context_data")
    
    if echo "$alignment_result" | grep -q '"error"'; then
        echo "$alignment_result"
        return 1
    fi
    
    # Extract alignment scores for guidance generation
    local alignment_scores=$(echo "$alignment_result" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    scores = {}
    if 'dimension_breakdown' in data:
        for dim, details in data['dimension_breakdown'].items():
            scores[dim] = details.get('score', 0) * 100  # Convert to 0-100 scale
    print(json.dumps(scores))
except:
    print('{}')
" 2>/dev/null)
    
    # Generate recommendations
    local recommendations=$(carl_generate_alignment_recommendations "$feature_description" "$alignment_scores" "$user_role")
    
    # Format guidance output
    local formatted_guidance=$(carl_format_guidance_output "$recommendations" "$guidance_format")
    
    # Combine alignment results with guidance
    echo "$alignment_result" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    guidance = '''$formatted_guidance'''
    data['strategic_guidance'] = guidance
    data['guidance_metadata'] = {
        'user_role': '''$user_role''',
        'format': '''$guidance_format''',
        'generated_at': data.get('validation_metadata', {}).get('timestamp', '')
    }
    print(json.dumps(data, indent=2))
except Exception as e:
    print(json.dumps({'error': f'Guidance integration failed: {str(e)}'}))
" 2>/dev/null || echo "$alignment_result"
}

carl_get_vision_context() {
    local carl_root="$(carl_get_root)"
    local vision_file="$carl_root/.carl/project/vision.carl"
    
    if [ ! -f "$vision_file" ]; then
        return 0
    fi
    
    # Extract core vision context for AI injection
    local context=""
    context+="## Project Vision Context\n"
    
    # Get project identity
    local project_identity=$(grep -A 5 "project_identity:" "$vision_file" 2>/dev/null | grep -v "^--$")
    if [ -n "$project_identity" ]; then
        context+="### Project Identity\n"
        context+="$project_identity\n\n"
    fi
    
    # Get strategic objectives (first 3)
    local objectives=$(grep -A 15 "strategic_objectives:" "$vision_file" 2>/dev/null | head -20)
    if [ -n "$objectives" ]; then
        context+="### Strategic Objectives\n"
        context+="$objectives\n\n"
    fi
    
    # Get alignment criteria weights
    local criteria=$(grep -A 10 "alignment_criteria:" "$vision_file" 2>/dev/null | grep "weight:" | head -5)
    if [ -n "$criteria" ]; then
        context+="### Alignment Criteria Weights\n"
        context+="$criteria\n\n"
    fi
    
    echo -e "$context"
}

# Enhanced Alignment Validation Engine Functions
# Comprehensive feature alignment validation with batch processing

carl_validate_intent_alignment() {
    local intent_file="$1"
    local carl_root="$(carl_get_root)"
    
    if [ ! -f "$intent_file" ]; then
        echo "{\"error\": \"Intent file not found\", \"path\": \"$intent_file\"}"
        return 1
    fi
    
    # Extract feature description from intent file
    local feature_description=$(grep -A 5 "what:" "$intent_file" | grep -v "^--$" | tail -n +2 | tr '\n' ' ')
    local feature_context=$(grep -A 10 "scope_definition:" "$intent_file" | head -15)
    
    # Validate using enhanced alignment function
    carl_validate_feature_alignment "$feature_description" "$feature_context"
}

carl_batch_validate_features() {
    local feature_list="$1"
    local carl_root="$(carl_get_root)"
    local batch_results="{"
    local first_item=true
    
    if [ -z "$feature_list" ]; then
        # Auto-discover intent files for batch validation
        feature_list=$(find "$carl_root/.carl/project" -name "*.intent.carl" 2>/dev/null | head -10)
    fi
    
    batch_results="\"batch_validation_results\": ["
    
    echo "$feature_list" | while IFS= read -r feature_path; do
        if [ -f "$feature_path" ]; then
            local feature_name=$(basename "$feature_path" .intent.carl)
            local validation_result=$(carl_validate_intent_alignment "$feature_path")
            
            if [ "$first_item" = true ]; then
                first_item=false
            else
                batch_results="$batch_results,"
            fi
            
            batch_results="$batch_results{\"feature\": \"$feature_name\", \"path\": \"$feature_path\", \"validation\": $validation_result}"
        fi
    done
    
    batch_results="$batch_results], \"batch_metadata\": {\"timestamp\": \"$(date -Iseconds)\", \"total_features\": $(echo "$feature_list" | wc -l)}}"
    echo "{$batch_results}"
}

carl_alignment_scoring_threshold_check() {
    local alignment_score="$1"
    local threshold_type="${2:-standard}"
    
    case "$threshold_type" in
        "strict")
            local threshold=0.8
            ;;
        "standard")
            local threshold=0.7
            ;;
        "lenient")
            local threshold=0.5
            ;;
        *)
            local threshold=0.7
            ;;
    esac
    
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "
import json
score = float('$alignment_score')
threshold = float('$threshold')
passed = score >= threshold
result = {
    'score': score,
    'threshold': threshold,
    'threshold_type': '$threshold_type',
    'passed': passed,
    'recommendation': 'proceed' if passed else 'review_alignment',
    'confidence_level': 'high' if score > 0.8 else 'medium' if score > 0.6 else 'low'
}
print(json.dumps(result, indent=2))
"
    else
        echo "{\"error\": \"Python3 required for threshold evaluation\"}"
        return 1
    fi
}

carl_alignment_engine_performance_test() {
    local test_feature="AI-optimized context system for strategic alignment validation with automated vision-based scoring and pivot detection"
    local start_time=$(date +%s%N)
    
    # Run alignment validation
    local result=$(carl_validate_feature_alignment "$test_feature")
    
    local end_time=$(date +%s%N)
    local duration_ms=$(( (end_time - start_time) / 1000000 ))
    
    echo "{\"performance_test\": {\"duration_ms\": $duration_ms, \"target_ms\": 500, \"passed\": $([ $duration_ms -lt 500 ] && echo 'true' || echo 'false'), \"validation_result\": $result}}"
}

carl_get_alignment_engine_status() {
    local carl_root="$(carl_get_root)"
    local vision_file="$carl_root/.carl/project/vision.carl"
    
    # Check system readiness
    local vision_available=$([ -f "$vision_file" ] && echo "true" || echo "false")
    local python_available=$(command -v python3 >/dev/null 2>&1 && echo "true" || echo "false")
    local yaml_available="false"
    
    if [ "$python_available" = "true" ]; then
        yaml_available=$(python3 -c "import yaml; print('true')" 2>/dev/null || echo "false")
    fi
    
    # Run performance test
    local performance_result=$(carl_alignment_engine_performance_test 2>/dev/null)
    
    echo "{
    \"alignment_engine_status\": {
        \"vision_file_available\": $vision_available,
        \"python3_available\": $python_available,
        \"yaml_parsing_available\": $yaml_available,
        \"system_ready\": $([ "$vision_available" = "true" ] && [ "$python_available" = "true" ] && [ "$yaml_available" = "true" ] && echo 'true' || echo 'false'),
        \"performance_test\": $performance_result
    }
}"
}

# Cross-platform formatting utilities for consistent output
# Implements environment-aware line break handling for CARL task command responses

carl_detect_platform_line_break_standard() {
    # Cache the platform detection result in session variable
    if [ -n "$CARL_LINE_BREAK_STANDARD" ]; then
        echo "$CARL_LINE_BREAK_STANDARD"
        return 0
    fi
    
    # Primary: Check OS environment variable
    if [ -n "$OS" ] && echo "$OS" | grep -qi "windows"; then
        export CARL_LINE_BREAK_STANDARD="CRLF"
        echo "CRLF"
        return 0
    fi
    
    # Secondary: Use uname command output analysis
    if command -v uname >/dev/null 2>&1; then
        local system_type=$(uname -s)
        case "$system_type" in
            CYGWIN*|MINGW*|MSYS*)
                export CARL_LINE_BREAK_STANDARD="CRLF"
                echo "CRLF"
                return 0
                ;;
            *)
                export CARL_LINE_BREAK_STANDARD="LF"
                echo "LF"
                return 0
                ;;
        esac
    fi
    
    # Fallback: Assume Unix LF standard
    export CARL_LINE_BREAK_STANDARD="LF"
    echo "LF"
}

carl_get_line_break_char() {
    local platform_standard=$(carl_detect_platform_line_break_standard)
    
    case "$platform_standard" in
        "CRLF")
            printf "\r\n"
            ;;
        "LF"|*)
            printf "\n"
            ;;
    esac
}

carl_format_output_with_proper_line_breaks() {
    local input_text="$1"
    local preserve_formatting="${2:-false}"
    
    if [ -z "$input_text" ]; then
        return 0
    fi
    
    # Get the appropriate line break character for the platform
    local line_break_char=$(carl_get_line_break_char)
    
    if [ "$preserve_formatting" = "true" ]; then
        # Preserve existing formatting but ensure consistent line breaks
        echo "$input_text" | sed "s/\r\n/\n/g" | sed "s/\n/$line_break_char/g"
    else
        # Apply standard formatting with proper line breaks
        echo "$input_text" | sed "s/\r\n/\n/g" | sed "s/\n/$line_break_char/g"
    fi
}

carl_ensure_readable_text_formatting() {
    local input_text="$1"
    local format_type="${2:-standard}"
    
    if [ -z "$input_text" ]; then
        return 0
    fi
    
    local platform_standard=$(carl_detect_platform_line_break_standard)
    
    case "$format_type" in
        "task_suggestions")
            # Format task suggestion template with proper spacing
            if [ "$platform_standard" = "CRLF" ]; then
                echo "$input_text" | \
                    sed 's/🔥 Continue Current Work:/\r\n🔥 Continue Current Work:/g' | \
                    sed 's/⚡ Next Logical Tasks:/\r\n⚡ Next Logical Tasks:/g' | \
                    sed 's/📋 Available from Queue:/\r\n📋 Available from Queue:/g' | \
                    sed 's/🚀 Quick Wins:/\r\n🚀 Quick Wins:/g' | \
                    sed 's/Which task would you like to work on?/\r\n\r\nWhich task would you like to work on?/g'
            else
                echo "$input_text" | \
                    sed 's/🔥 Continue Current Work:/\n🔥 Continue Current Work:/g' | \
                    sed 's/⚡ Next Logical Tasks:/\n⚡ Next Logical Tasks:/g' | \
                    sed 's/📋 Available from Queue:/\n📋 Available from Queue:/g' | \
                    sed 's/🚀 Quick Wins:/\n🚀 Quick Wins:/g' | \
                    sed 's/Which task would you like to work on?/\n\nWhich task would you like to work on?/g'
            fi
            ;;
        "task_execution")
            # Format task execution output with clear section breaks
            if [ "$platform_standard" = "CRLF" ]; then
                echo "$input_text" | \
                    sed 's/## /\r\n\r\n## /g' | \
                    sed 's/### /\r\n### /g' | \
                    sed 's/\*\*Next Steps\*\*:/\r\n**Next Steps**:/g' | \
                    sed 's/\*\*Implementation Points\*\*:/\r\n**Implementation Points**:/g'
            else
                echo "$input_text" | \
                    sed 's/## /\n\n## /g' | \
                    sed 's/### /\n### /g' | \
                    sed 's/\*\*Next Steps\*\*:/\n**Next Steps**:/g' | \
                    sed 's/\*\*Implementation Points\*\*:/\n**Implementation Points**:/g'
            fi
            ;;
        "error_guidance")
            # Format error messages and guidance with clear separation
            if [ "$platform_standard" = "CRLF" ]; then
                echo "$input_text" | \
                    sed 's/❌ ERROR:/\r\n❌ ERROR:/g' | \
                    sed 's/✅ Suggested path:/\r\n✅ Suggested path:/g' | \
                    sed 's/🔧 CARL Process:/\r\n🔧 CARL Process:/g'
            else
                echo "$input_text" | \
                    sed 's/❌ ERROR:/\n❌ ERROR:/g' | \
                    sed 's/✅ Suggested path:/\n✅ Suggested path:/g' | \
                    sed 's/🔧 CARL Process:/\n🔧 CARL Process:/g'
            fi
            ;;
        "standard"|*)
            # Standard formatting with consistent line breaks
            carl_format_output_with_proper_line_breaks "$input_text" false
            ;;
    esac
}

carl_print_formatted() {
    local text="$1"
    local format_type="${2:-standard}"
    
    # Use printf instead of echo for better cross-platform compatibility
    local formatted_text=$(carl_ensure_readable_text_formatting "$text" "$format_type")
    printf "%s" "$formatted_text"
}

carl_print_section_header() {
    local header_text="$1"
    local level="${2:-2}"
    
    local line_break_char=$(carl_get_line_break_char)
    local header_prefix=""
    
    case "$level" in
        1) header_prefix="# " ;;
        2) header_prefix="## " ;;
        3) header_prefix="### " ;;
        *) header_prefix="## " ;;
    esac
    
    printf "%s%s%s%s%s" "$line_break_char" "$header_prefix" "$header_text" "$line_break_char" "$line_break_char"
}

carl_print_list_item() {
    local item_text="$1"
    local list_type="${2:-bullet}"
    local item_number="${3:-1}"
    
    local line_break_char=$(carl_get_line_break_char)
    local item_prefix=""
    
    case "$list_type" in
        "numbered") item_prefix="${item_number}. " ;;
        "bullet") item_prefix="- " ;;
        "checkbox") item_prefix="- [ ] " ;;
        "checked") item_prefix="- [x] " ;;
        *) item_prefix="- " ;;
    esac
    
    printf "%s%s%s" "$item_prefix" "$item_text" "$line_break_char"
}

carl_reset_formatting_cache() {
    # Reset cached platform detection for new sessions
    unset CARL_LINE_BREAK_STANDARD
}

# Completed Intent Organization System Functions
# Automatic detection and organization of completed CARL intent files

carl_detect_completed_intent() {
    local intent_file="$1"
    
    if [ ! -f "$intent_file" ]; then
        return 1
    fi
    
    # Check if intent file has status: "completed"
    local intent_status=$(grep "^status:" "$intent_file" 2>/dev/null | cut -d':' -f2 | tr -d ' "')
    
    if [ "$intent_status" = "completed" ]; then
        echo "intent_completed"
        return 0
    fi
    
    return 1
}

carl_detect_completed_state() {
    local state_file="$1"
    
    if [ ! -f "$state_file" ]; then
        return 1
    fi
    
    # Check for overall_status: "completed" OR (completion_percentage: 100 AND phase: "completed")
    local overall_status=$(grep "^overall_status:" "$state_file" 2>/dev/null | cut -d':' -f2 | tr -d ' "')
    local completion_percentage=$(grep "^overall_completion:" "$state_file" 2>/dev/null | cut -d':' -f2 | tr -d ' ')
    
    # Primary check: overall_status completed
    if [ "$overall_status" = "completed" ]; then
        echo "state_completed"
        return 0
    fi
    
    # Secondary check: 100% completion
    if [ "$completion_percentage" = "100" ]; then
        echo "state_completed_100_percent"
        return 0
    fi
    
    return 1
}

carl_validate_completion_alignment() {
    local intent_file="$1"
    local state_file="$2"
    
    # Validate both intent and state alignment for completion
    local intent_result=$(carl_detect_completed_intent "$intent_file" 2>/dev/null)
    local state_result=$(carl_detect_completed_state "$state_file" 2>/dev/null)
    
    if [ -n "$intent_result" ] && [ -n "$state_result" ]; then
        echo "aligned_completion"
        return 0
    elif [ -n "$intent_result" ] || [ -n "$state_result" ]; then
        echo "partial_completion"
        return 2
    else
        echo "not_completed"
        return 1
    fi
}

carl_find_completed_files() {
    local carl_root="$(carl_get_root)"
    local scan_type="${1:-all}"
    
    # Find all intent files and check completion status
    local completed_files=""
    
    case "$scan_type" in
        "epics")
            local search_path="$carl_root/.carl/project/epics"
            ;;
        "features")
            local search_path="$carl_root/.carl/project/features"
            ;;
        "stories")
            local search_path="$carl_root/.carl/project/stories"
            ;;
        "technical")
            local search_path="$carl_root/.carl/project/technical"
            ;;
        "all"|*)
            local search_path="$carl_root/.carl/project"
            ;;
    esac
    
    # Find intent files in the specified path
    find "$search_path" -name "*.intent.carl" -type f 2>/dev/null | while read intent_file; do
        if [ -f "$intent_file" ]; then
            local base_name=$(basename "$intent_file" .intent.carl)
            local dir_name=$(dirname "$intent_file")
            local state_file="$dir_name/$base_name.state.carl"
            
            local completion_status=$(carl_validate_completion_alignment "$intent_file" "$state_file")
            
            if [ "$completion_status" = "aligned_completion" ]; then
                echo "$intent_file|$state_file|aligned_completion"
            elif [ "$completion_status" = "partial_completion" ]; then
                echo "$intent_file|$state_file|partial_completion"
            fi
        fi
    done
}

carl_create_completed_directory() {
    local intent_type_dir="$1"
    
    if [ ! -d "$intent_type_dir" ]; then
        echo "❌ Error: Intent type directory does not exist: $intent_type_dir"
        return 1
    fi
    
    local completed_dir="$intent_type_dir/completed"
    
    # Check if completed directory already exists
    if [ -d "$completed_dir" ]; then
        return 0  # Already exists, success
    fi
    
    # Create completed directory with same permissions as parent
    local parent_perms=$(stat -c %a "$intent_type_dir" 2>/dev/null)
    
    if mkdir "$completed_dir" 2>/dev/null; then
        # Preserve permissions if we can determine them
        if [ -n "$parent_perms" ]; then
            chmod "$parent_perms" "$completed_dir" 2>/dev/null
        fi
        echo "✅ Created completed directory: $completed_dir"
        return 0
    else
        echo "❌ Error: Failed to create completed directory: $completed_dir"
        return 1
    fi
}

carl_ensure_completed_directories() {
    local carl_root="$(carl_get_root)"
    local created_count=0
    
    # Ensure completed directories exist in all intent type directories
    local intent_types=("epics" "features" "stories" "technical")
    
    for intent_type in "${intent_types[@]}"; do
        local type_dir="$carl_root/.carl/project/$intent_type"
        if [ -d "$type_dir" ]; then
            if carl_create_completed_directory "$type_dir"; then
                created_count=$((created_count + 1))
            fi
        fi
    done
    
    echo "Completed directory check: $created_count directories processed"
    return 0
}

carl_scan_for_completed_work() {
    local carl_root="$(carl_get_root)"
    local scan_results_file="/tmp/carl_completed_scan_$(date +%s).tmp"
    
    echo "## CARL Completion Detection Scan Results"
    echo "Timestamp: $(date -Iseconds)"
    echo
    
    # Ensure completed directories exist first
    carl_ensure_completed_directories
    echo
    
    # Scan for completed files
    local completed_found=0
    local partially_completed=0
    
    echo "### Scanning for Completed Work..."
    
    carl_find_completed_files "all" > "$scan_results_file"
    
    if [ -s "$scan_results_file" ]; then
        while IFS='|' read -r intent_file state_file completion_status; do
            local base_name=$(basename "$intent_file" .intent.carl)
            local intent_type=$(basename "$(dirname "$intent_file")")
            
            if [ "$completion_status" = "aligned_completion" ]; then
                echo "✅ **Ready for Organization**: $intent_type/$base_name"
                completed_found=$((completed_found + 1))
            elif [ "$completion_status" = "partial_completion" ]; then
                echo "⚠️  **Partial Completion**: $intent_type/$base_name"
                partially_completed=$((partially_completed + 1))
            fi
        done < "$scan_results_file"
    fi
    
    # Clean up temp file
    rm -f "$scan_results_file" 2>/dev/null
    
    echo
    echo "### Summary"
    echo "- **Ready for Organization**: $completed_found items"
    echo "- **Partially Completed**: $partially_completed items"
    echo "- **Completed Directories**: All ensured to exist"
    
    if [ $completed_found -gt 0 ]; then
        echo
        echo "**Next Steps**: Items ready for organization can be processed by file movement system"
        return 0
    else
        echo
        echo "**Status**: No completed items detected requiring organization"
        return 1
    fi
}

# Safe File Movement Functions with Git History Preservation

carl_validate_git_repository() {
    local carl_root="$(carl_get_root)"
    
    # Check if we're in a git repository
    if ! git -C "$carl_root" rev-parse --git-dir >/dev/null 2>&1; then
        echo "not_git_repository"
        return 1
    fi
    
    # Check if git status is clean (no uncommitted changes)
    if ! git -C "$carl_root" diff-index --quiet HEAD 2>/dev/null; then
        echo "dirty_working_tree"
        return 2
    fi
    
    echo "clean_git_repository"
    return 0
}

carl_safe_git_mv() {
    local source_file="$1"
    local target_file="$2"
    local carl_root="$(carl_get_root)"
    
    # Validation checks
    if [ ! -f "$source_file" ]; then
        echo "❌ Error: Source file does not exist: $source_file"
        return 1
    fi
    
    local target_dir=$(dirname "$target_file")
    if [ ! -d "$target_dir" ]; then
        echo "❌ Error: Target directory does not exist: $target_dir"
        return 1
    fi
    
    # Check if target file already exists
    if [ -f "$target_file" ]; then
        echo "❌ Error: Target file already exists: $target_file"
        return 1
    fi
    
    # Validate git repository status
    local git_status=$(carl_validate_git_repository)
    
    if [ "$git_status" = "not_git_repository" ]; then
        echo "⚠️  Warning: Not in git repository, using regular mv"
        if mv "$source_file" "$target_file" 2>/dev/null; then
            echo "✅ Moved: $source_file → $target_file (regular mv)"
            return 0
        else
            echo "❌ Error: Failed to move file"
            return 1
        fi
    elif [ "$git_status" = "dirty_working_tree" ]; then
        echo "⚠️  Warning: Git working tree is dirty, using regular mv"
        if mv "$source_file" "$target_file" 2>/dev/null; then
            echo "✅ Moved: $source_file → $target_file (regular mv)"
            return 0
        else
            echo "❌ Error: Failed to move file"
            return 1
        fi
    fi
    
    # Use git mv to preserve history
    if git -C "$carl_root" mv "$source_file" "$target_file" 2>/dev/null; then
        echo "✅ Moved: $source_file → $target_file (git mv)"
        return 0
    else
        echo "❌ Error: Git mv failed, attempting fallback"
        # Fallback to regular mv
        if mv "$source_file" "$target_file" 2>/dev/null; then
            echo "✅ Moved: $source_file → $target_file (fallback mv)"
            return 0
        else
            echo "❌ Error: Both git mv and regular mv failed"
            return 1
        fi
    fi
}

carl_move_completed_file_pair() {
    local intent_file="$1"
    local state_file="$2"
    local carl_root="$(carl_get_root)"
    
    # Validate completion status first
    local completion_status=$(carl_validate_completion_alignment "$intent_file" "$state_file")
    if [ "$completion_status" != "aligned_completion" ]; then
        echo "❌ Error: Files are not aligned for completion: $completion_status"
        return 1
    fi
    
    # Determine target paths
    local intent_dir=$(dirname "$intent_file")
    local intent_type=$(basename "$intent_dir")
    local base_name=$(basename "$intent_file" .intent.carl)
    
    local target_intent_dir="$intent_dir/completed"
    local target_state_dir="$target_intent_dir"
    
    local target_intent_file="$target_intent_dir/$base_name.intent.carl"
    local target_state_file="$target_state_dir/$base_name.state.carl"
    
    # Ensure target directory exists
    if ! carl_create_completed_directory "$intent_dir" >/dev/null; then
        echo "❌ Error: Failed to create completed directory"
        return 1
    fi
    
    # Create temporary backup state for rollback
    local backup_dir="/tmp/carl_backup_$(date +%s)"
    mkdir -p "$backup_dir"
    
    cp "$intent_file" "$backup_dir/" 2>/dev/null
    if [ -f "$state_file" ]; then
        cp "$state_file" "$backup_dir/" 2>/dev/null
    fi
    
    # Atomic operation: move both files
    local intent_moved=false
    local state_moved=false
    
    # Move intent file
    if carl_safe_git_mv "$intent_file" "$target_intent_file"; then
        intent_moved=true
    else
        echo "❌ Error: Failed to move intent file"
        rm -rf "$backup_dir" 2>/dev/null
        return 1
    fi
    
    # Move state file if it exists
    if [ -f "$state_file" ]; then
        if carl_safe_git_mv "$state_file" "$target_state_file"; then
            state_moved=true
        else
            echo "❌ Error: Failed to move state file, rolling back intent file"
            # Rollback intent file
            carl_safe_git_mv "$target_intent_file" "$intent_file" >/dev/null
            rm -rf "$backup_dir" 2>/dev/null
            return 1
        fi
    fi
    
    # Validate successful movement
    if [ -f "$target_intent_file" ] && ([ ! -f "$state_file" ] || [ -f "$target_state_file" ]); then
        echo "✅ Successfully moved completed file pair:"
        echo "   Intent: $intent_file → $target_intent_file"
        if [ "$state_moved" = true ]; then
            echo "   State:  $state_file → $target_state_file"
        fi
        
        # Clean up backup
        rm -rf "$backup_dir" 2>/dev/null
        return 0
    else
        echo "❌ Error: Movement validation failed, attempting rollback"
        # Attempt rollback
        carl_rollback_file_movement "$backup_dir" "$intent_file" "$state_file"
        return 1
    fi
}

carl_rollback_file_movement() {
    local backup_dir="$1"
    local original_intent="$2"  
    local original_state="$3"
    
    echo "🔄 Attempting rollback from backup: $backup_dir"
    
    if [ -d "$backup_dir" ]; then
        local backup_intent="$backup_dir/$(basename "$original_intent")"
        local backup_state="$backup_dir/$(basename "$original_state")"
        
        local rollback_success=true
        
        # Restore intent file
        if [ -f "$backup_intent" ]; then
            if ! cp "$backup_intent" "$original_intent" 2>/dev/null; then
                rollback_success=false
            fi
        fi
        
        # Restore state file
        if [ -f "$backup_state" ]; then
            if ! cp "$backup_state" "$original_state" 2>/dev/null; then
                rollback_success=false
            fi
        fi
        
        # Clean up backup
        rm -rf "$backup_dir" 2>/dev/null
        
        if [ "$rollback_success" = true ]; then
            echo "✅ Rollback successful"
            return 0
        else
            echo "❌ Rollback failed - manual intervention required"
            return 1
        fi
    else
        echo "❌ No backup directory found for rollback"
        return 1
    fi
}

carl_organize_completed_files() {
    local carl_root="$(carl_get_root)"
    local scan_results_file="/tmp/carl_organize_$(date +%s).tmp"
    
    echo "## CARL File Organization - Completed Items"
    echo "Timestamp: $(date -Iseconds)"
    echo
    
    # Scan for completed files ready for organization
    carl_find_completed_files "all" > "$scan_results_file"
    
    local organized_count=0
    local failed_count=0
    
    if [ -s "$scan_results_file" ]; then
        echo "### Processing Completed Files..."
        
        while IFS='|' read -r intent_file state_file completion_status; do
            if [ "$completion_status" = "aligned_completion" ]; then
                local base_name=$(basename "$intent_file" .intent.carl)
                local intent_type=$(basename "$(dirname "$intent_file")")
                
                echo
                echo "**Processing**: $intent_type/$base_name"
                
                if carl_move_completed_file_pair "$intent_file" "$state_file"; then
                    organized_count=$((organized_count + 1))
                else
                    failed_count=$((failed_count + 1))
                fi
            fi
        done < "$scan_results_file"
    fi
    
    # Clean up temp file
    rm -f "$scan_results_file" 2>/dev/null
    
    echo
    echo "### Organization Summary"
    echo "- **Successfully Organized**: $organized_count items"
    echo "- **Failed**: $failed_count items"
    
    if [ $organized_count -gt 0 ]; then
        echo
        echo "**Next Steps**: Reference integrity system can now update file references"
        return 0
    elif [ $failed_count -gt 0 ]; then
        echo
        echo "**Status**: Some files failed to organize - manual intervention may be required"
        return 1
    else
        echo
        echo "**Status**: No completed files found requiring organization"
        return 2
    fi
}

# Pivot Detection System Functions
# Intelligent system to distinguish strategic pivots from feature misalignment

carl_detect_strategic_pivot() {
    local feature_description="$1"
    local context_data="$2"
    local carl_root="$(carl_get_root)"
    
    # Get alignment validation first
    local alignment_result=$(carl_validate_feature_alignment "$feature_description" "$context_data")
    
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "
import json, re
from datetime import datetime

def analyze_pivot_indicators(feature_desc, alignment_data):
    try:
        alignment = json.loads('''$alignment_result''')
    except:
        return {'error': 'Invalid alignment data for pivot analysis'}
    
    if 'overall_alignment_score' not in alignment:
        return {'error': 'Alignment score not found'}
    
    overall_score = alignment['overall_alignment_score']
    dimension_breakdown = alignment.get('dimension_breakdown', {})
    
    # Pivot detection algorithm
    pivot_indicators = {
        'low_overall_alignment': overall_score < 0.3,
        'high_strategic_coherence_despite_low_score': False,
        'technical_architecture_mismatch': False,
        'business_value_gap': False,
        'resource_constraint_conflict': False
    }
    
    # Analyze dimension patterns
    if 'strategic_coherence' in dimension_breakdown:
        strategic_score = dimension_breakdown['strategic_coherence']['score']
        pivot_indicators['high_strategic_coherence_despite_low_score'] = strategic_score > 0.6 and overall_score < 0.4
    
    if 'technical_architecture' in dimension_breakdown:
        tech_score = dimension_breakdown['technical_architecture']['score']
        pivot_indicators['technical_architecture_mismatch'] = tech_score < 0.3
    
    if 'business_value' in dimension_breakdown:
        business_score = dimension_breakdown['business_value']['score']
        pivot_indicators['business_value_gap'] = business_score < 0.2
    
    # Pivot keywords analysis
    feature_lower = '''$feature_description'''.lower()
    pivot_keywords = ['pivot', 'direction', 'strategy', 'vision', 'transform', 'shift', 'change', 'new', 'different']
    pivot_keyword_matches = sum(1 for kw in pivot_keywords if kw in feature_lower)
    
    # Calculate pivot probability
    pivot_score = 0.0
    
    if pivot_indicators['low_overall_alignment']:
        pivot_score += 0.3
    
    if pivot_indicators['high_strategic_coherence_despite_low_score']:
        pivot_score += 0.4
    
    if pivot_keyword_matches > 0:
        pivot_score += min(pivot_keyword_matches * 0.1, 0.3)
    
    # Technical architecture mismatch might indicate infrastructure pivot
    if pivot_indicators['technical_architecture_mismatch']:
        pivot_score += 0.2
    
    is_potential_pivot = pivot_score > 0.5
    
    # Generate pivot analysis
    pivot_type = 'none'
    if is_potential_pivot:
        if pivot_indicators['high_strategic_coherence_despite_low_score']:
            pivot_type = 'strategic_evolution'
        elif pivot_indicators['technical_architecture_mismatch']:
            pivot_type = 'technical_pivot'
        elif pivot_indicators['business_value_gap']:
            pivot_type = 'business_model_pivot'
        else:
            pivot_type = 'general_direction_change'
    
    recommendations = []
    if is_potential_pivot:
        recommendations.append('Potential strategic pivot detected - requires stakeholder review')
        recommendations.append('Update project vision file if this represents intentional direction change')
        recommendations.append('Consider broader impact on existing features and roadmap')
    else:
        recommendations.append('Feature appears misaligned rather than pivotal')
        recommendations.append('Review alignment criteria and consider feature refinement')
    
    return {
        'pivot_analysis': {
            'is_potential_pivot': is_potential_pivot,
            'pivot_probability': round(pivot_score, 3),
            'pivot_type': pivot_type,
            'pivot_indicators': pivot_indicators,
            'pivot_keyword_matches': pivot_keyword_matches
        },
        'alignment_summary': {
            'overall_score': overall_score,
            'dimension_breakdown': dimension_breakdown
        },
        'recommendations': recommendations,
        'metadata': {
            'analysis_timestamp': datetime.now().isoformat(),
            'detection_algorithm': 'keyword_and_pattern_analysis',
            'confidence_level': 'medium'
        }
    }

result = analyze_pivot_indicators('''$feature_description''', '''$alignment_result''')
print(json.dumps(result, indent=2))
"
    else
        echo "{\"error\": \"Python3 required for pivot detection analysis\"}"
        return 1
    fi
}

carl_analyze_project_pivot_trend() {
    local carl_root="$(carl_get_root)"
    local intent_files=$(find "$carl_root/.carl/project" -name "*.intent.carl" -type f 2>/dev/null | head -10)
    
    if [ -z "$intent_files" ]; then
        echo "{\"error\": \"No intent files found for pivot trend analysis\"}"
        return 1
    fi
    
    local pivot_count=0
    local total_features=0
    local pivot_details="["
    local first_item=true
    
    echo "$intent_files" | while IFS= read -r intent_file; do
        if [ -f "$intent_file" ]; then
            local feature_name=$(basename "$intent_file" .intent.carl)
            local feature_description=$(grep -A 5 "what:" "$intent_file" | tail -n +2 | tr '\n' ' ')
            
            if [ -n "$feature_description" ]; then
                local pivot_result=$(carl_detect_strategic_pivot "$feature_description")
                local is_pivot=$(echo "$pivot_result" | python3 -c "import json, sys; data=json.load(sys.stdin); print(data.get('pivot_analysis', {}).get('is_potential_pivot', False))" 2>/dev/null)
                
                total_features=$((total_features + 1))
                
                if [ "$is_pivot" = "True" ]; then
                    pivot_count=$((pivot_count + 1))
                    
                    if [ "$first_item" = true ]; then
                        first_item=false
                    else
                        pivot_details="$pivot_details,"
                    fi
                    
                    pivot_details="$pivot_details{\"feature\": \"$feature_name\", \"pivot_analysis\": $pivot_result}"
                fi
            fi
        fi
    done
    
    pivot_details="$pivot_details]"
    
    local pivot_percentage=0
    if [ "$total_features" -gt 0 ]; then
        pivot_percentage=$(( (pivot_count * 100) / total_features ))
    fi
    
    echo "{
    \"project_pivot_trend\": {
        \"total_features_analyzed\": $total_features,
        \"potential_pivots_detected\": $pivot_count,
        \"pivot_percentage\": $pivot_percentage,
        \"trend_assessment\": \"$([ $pivot_percentage -gt 30 ] && echo 'high_pivot_activity' || [ $pivot_percentage -gt 10 ] && echo 'moderate_pivot_activity' || echo 'stable_direction')\",
        \"pivot_details\": $pivot_details,
        \"analysis_timestamp\": \"$(date -Iseconds)\"
    }
}"
}

carl_pivot_threshold_evaluation() {
    local pivot_probability="$1"
    local context_importance="${2:-standard}"
    
    # Define thresholds based on context importance
    case "$context_importance" in
        "critical")
            local pivot_threshold=0.3
            ;;
        "standard")  
            local pivot_threshold=0.5
            ;;
        "exploratory")
            local pivot_threshold=0.7
            ;;
        *)
            local pivot_threshold=0.5
            ;;
    esac
    
    if command -v python3 >/dev/null 2>&1; then
        python3 -c "
import json
probability = float('$pivot_probability')
threshold = float('$pivot_threshold')
is_pivot = probability >= threshold

result = {
    'pivot_probability': probability,
    'threshold': threshold,
    'context_importance': '$context_importance',
    'is_strategic_pivot': is_pivot,
    'confidence_level': 'high' if probability > 0.8 else 'medium' if probability > 0.5 else 'low',
    'recommended_action': 'stakeholder_review' if is_pivot else 'feature_refinement'
}
print(json.dumps(result, indent=2))
"
    else
        echo "{\"error\": \"Python3 required for pivot threshold evaluation\"}"
        return 1
    fi
}

# ==========================================
# Story 3: Reference Integrity and Update System
# ==========================================

# Validate all references are intact after updates
carl_validate_reference_integrity() {
    local carl_root="$(carl_get_root)"
    local broken_refs=0
    local checked_refs=0
    
    echo "Validating reference integrity across CARL project..." >&2
    
    # Check active.work.carl references
    if [ -f "$carl_root/.carl/project/active.work.carl" ]; then
        echo "Checking active.work.carl references..." >&2
        while IFS= read -r line; do
            if echo "$line" | grep -q '\.intent\.carl\|\.state\.carl' 2>/dev/null; then
                # Extract potential file paths
                local potential_paths=$(echo "$line" | grep -o '[^[:space:]]*\.carl' 2>/dev/null || true)
                for path in $potential_paths; do
                    checked_refs=$((checked_refs + 1))
                    # Check if file exists (try both absolute and relative from CARL root)
                    if [ ! -f "$path" ] && [ ! -f "$carl_root/$path" ]; then
                        echo "ERROR: Broken reference in active.work.carl: $path" >&2
                        broken_refs=$((broken_refs + 1))
                    fi
                done
            fi
        done < "$carl_root/.carl/project/active.work.carl"
    fi
    
    # Check state file references
    find "$carl_root" -name "*.state.carl" -type f | while IFS= read -r state_file; do
        if grep -q 'intent_file:' "$state_file" 2>/dev/null; then
            local intent_ref=$(grep 'intent_file:' "$state_file" | head -1 | sed 's/.*intent_file:[[:space:]]*"//' | sed 's/".*$//')
            if [ -n "$intent_ref" ]; then
                checked_refs=$((checked_refs + 1))
                # Check if referenced intent file exists
                if [ ! -f "$carl_root/$intent_ref" ] && [ ! -f "$intent_ref" ]; then
                    echo "ERROR: Broken intent reference in $(basename "$state_file"): $intent_ref" >&2
                    broken_refs=$((broken_refs + 1))
                fi
            fi
        fi
    done
    
    echo "Reference validation complete: $checked_refs checked, $broken_refs broken" >&2
    
    if [ "$broken_refs" -eq 0 ]; then
        echo "SUCCESS: All references are intact"
        return 0
    else
        echo "ERROR: Found $broken_refs broken references"
        return 1
    fi
}

# Update references in active.work.carl to remove completed items
carl_update_active_work_references() {
    local intent_file="$1"
    local carl_root="$(carl_get_root)"
    local active_work="$carl_root/.carl/project/active.work.carl"
    local backup_file="/tmp/active_work_backup_$(date +%s).carl"
    
    if [ -z "$intent_file" ]; then
        echo "ERROR: Intent file path required"
        return 1
    fi
    
    if [ ! -f "$active_work" ]; then
        echo "WARNING: active.work.carl not found - no updates needed"
        return 0
    fi
    
    # Create backup
    if ! cp "$active_work" "$backup_file"; then
        echo "ERROR: Failed to create backup of active.work.carl"
        return 1
    fi
    
    # Get the relative path and base name
    local rel_path
    if [[ "$intent_file" == "$carl_root"* ]]; then
        rel_path="${intent_file#$carl_root/}"
    else
        rel_path="$intent_file"
    fi
    local base_name=$(basename "$intent_file" .intent.carl)
    
    # Remove references to the completed intent file
    local temp_file="/tmp/active_work_update_$(date +%s).tmp"
    local updated=false
    
    # Process the file line by line to preserve formatting
    while IFS= read -r line; do
        # Skip lines that reference the completed intent
        if echo "$line" | grep -q "$rel_path\|$base_name" 2>/dev/null; then
            echo "Removing reference: $line" >&2
            updated=true
            continue
        fi
        echo "$line"
    done < "$active_work" > "$temp_file"
    
    if [ "$updated" = true ]; then
        if mv "$temp_file" "$active_work"; then
            echo "SUCCESS: Updated active.work.carl - removed completed item references"
            rm -f "$backup_file" 2>/dev/null
            return 0
        else
            echo "ERROR: Failed to update active.work.carl - restoring backup"
            cp "$backup_file" "$active_work" 2>/dev/null
            rm -f "$temp_file" "$backup_file" 2>/dev/null
            return 1
        fi
    else
        echo "INFO: No references found in active.work.carl - no updates needed"
        rm -f "$temp_file" "$backup_file" 2>/dev/null
        return 0
    fi
}

# Update path references in state files
carl_update_state_file_references() {
    local old_path="$1"
    local new_path="$2"
    local carl_root="$(carl_get_root)"
    local updated_files=0
    local failed_files=0
    
    if [ -z "$old_path" ] || [ -z "$new_path" ]; then
        echo "ERROR: Both old and new paths required"
        return 1
    fi
    
    # Convert to relative paths for consistency
    local old_rel new_rel
    if [[ "$old_path" == "$carl_root"* ]]; then
        old_rel="${old_path#$carl_root/}"
    else
        old_rel="$old_path"
    fi
    
    if [[ "$new_path" == "$carl_root"* ]]; then
        new_rel="${new_path#$carl_root/}"
    else
        new_rel="$new_path"
    fi
    
    echo "Updating state file references: $old_rel -> $new_rel" >&2
    
    # Find all state files that might contain references
    find "$carl_root" -name "*.state.carl" -type f | while IFS= read -r state_file; do
        if grep -q "$old_rel" "$state_file" 2>/dev/null; then
            local backup_file="/tmp/state_backup_$(basename "$state_file")_$(date +%s).carl"
            
            # Create backup
            if cp "$state_file" "$backup_file"; then
                # Update references preserving formatting
                if sed -i.tmp "s|$old_rel|$new_rel|g" "$state_file" 2>/dev/null; then
                    echo "SUCCESS: Updated references in $(basename "$state_file")"
                    updated_files=$((updated_files + 1))
                    rm -f "$backup_file" "${state_file}.tmp" 2>/dev/null
                else
                    echo "ERROR: Failed to update $(basename "$state_file") - restoring backup"
                    cp "$backup_file" "$state_file" 2>/dev/null
                    failed_files=$((failed_files + 1))
                    rm -f "$backup_file" "${state_file}.tmp" 2>/dev/null
                fi
            else
                echo "ERROR: Failed to backup $(basename "$state_file")"
                failed_files=$((failed_files + 1))
            fi
        fi
    done
    
    echo "State file updates: $updated_files successful, $failed_files failed" >&2
    
    if [ "$failed_files" -gt 0 ]; then
        return 1
    else
        return 0
    fi
}

# Update cross-references in other intent files
carl_update_intent_cross_references() {
    local old_path="$1"
    local new_path="$2"
    local carl_root="$(carl_get_root)"
    local updated_files=0
    local failed_files=0
    
    if [ -z "$old_path" ] || [ -z "$new_path" ]; then
        echo "ERROR: Both old and new paths required"
        return 1
    fi
    
    # Convert to relative paths
    local old_rel new_rel
    if [[ "$old_path" == "$carl_root"* ]]; then
        old_rel="${old_path#$carl_root/}"
    else
        old_rel="$old_path"
    fi
    
    if [[ "$new_path" == "$carl_root"* ]]; then
        new_rel="${new_path#$carl_root/}"
    else
        new_rel="$new_path"
    fi
    
    echo "Updating intent cross-references: $old_rel -> $new_rel" >&2
    
    # Find all intent files that might contain cross-references
    find "$carl_root" -name "*.intent.carl" -type f | while IFS= read -r intent_file; do
        if grep -q "$old_rel\|$(basename "$old_path" .intent.carl)" "$intent_file" 2>/dev/null; then
            local backup_file="/tmp/intent_backup_$(basename "$intent_file")_$(date +%s).carl"
            
            # Create backup
            if cp "$intent_file" "$backup_file"; then
                # Update cross-references preserving formatting
                local temp_file="/tmp/intent_update_$(basename "$intent_file")_$(date +%s).tmp"
                local updated=false
                
                while IFS= read -r line; do
                    # Update various reference patterns
                    if echo "$line" | grep -q "$old_rel" 2>/dev/null; then
                        echo "${line//$old_rel/$new_rel}"
                        updated=true
                    elif echo "$line" | grep -q "$(basename "$old_path" .intent.carl)" 2>/dev/null; then
                        echo "${line//$(basename "$old_path" .intent.carl)/$(basename "$new_path" .intent.carl)}"
                        updated=true
                    else
                        echo "$line"
                    fi
                done < "$intent_file" > "$temp_file"
                
                if [ "$updated" = true ]; then
                    if mv "$temp_file" "$intent_file"; then
                        echo "SUCCESS: Updated cross-references in $(basename "$intent_file")"
                        updated_files=$((updated_files + 1))
                        rm -f "$backup_file" 2>/dev/null
                    else
                        echo "ERROR: Failed to update $(basename "$intent_file") - restoring backup"
                        cp "$backup_file" "$intent_file" 2>/dev/null
                        failed_files=$((failed_files + 1))
                        rm -f "$backup_file" "$temp_file" 2>/dev/null
                    fi
                else
                    rm -f "$temp_file" "$backup_file" 2>/dev/null
                fi
            else
                echo "ERROR: Failed to backup $(basename "$intent_file")"
                failed_files=$((failed_files + 1))
            fi
        fi
    done
    
    echo "Intent cross-reference updates: $updated_files successful, $failed_files failed" >&2
    
    if [ "$failed_files" -gt 0 ]; then
        return 1
    else
        return 0
    fi
}

# Scan for references to a specific file across the CARL project
carl_scan_file_references() {
    local target_file="$1"
    local carl_root="$(carl_get_root)"
    local references_file="/tmp/carl_references_$(date +%s).tmp"
    
    if [ -z "$target_file" ]; then
        echo "ERROR: Target file path required"
        return 1
    fi
    
    # Convert to relative path from CARL root for consistency
    local rel_path
    if [[ "$target_file" == "$carl_root"* ]]; then
        rel_path="${target_file#$carl_root/}"
    else
        rel_path="$target_file"
    fi
    
    echo "Scanning for references to: $rel_path" >&2
    
    # Scan various file types for references
    {
        # Scan .carl files for path references
        find "$carl_root" -name "*.carl" -type f -exec grep -l "$rel_path\|$(basename "$target_file")" {} \; 2>/dev/null || true
        
        # Scan active.work.carl specifically
        if [ -f "$carl_root/.carl/project/active.work.carl" ]; then
            if grep -q "$rel_path\|$(basename "$target_file")" "$carl_root/.carl/project/active.work.carl" 2>/dev/null; then
                echo "$carl_root/.carl/project/active.work.carl"
            fi
        fi
    } | sort -u > "$references_file"
    
    cat "$references_file"
    rm -f "$references_file" 2>/dev/null
}

# Main orchestration function for reference integrity updates
carl_update_all_references() {
    local old_intent_path="$1"
    local new_intent_path="$2"
    local old_state_path="$3"
    local new_state_path="$4"
    local carl_root="$(carl_get_root)"
    
    if [ -z "$old_intent_path" ] || [ -z "$new_intent_path" ]; then
        echo "ERROR: Old and new intent paths required"
        return 1
    fi
    
    echo "## CARL Reference Integrity Update"
    echo "Timestamp: $(date -Iseconds)"
    echo "Intent: $old_intent_path -> $new_intent_path"
    if [ -n "$old_state_path" ] && [ -n "$new_state_path" ]; then
        echo "State: $old_state_path -> $new_state_path"
    fi
    echo
    
    local update_success=true
    
    # Update active.work.carl references
    echo "### Updating active.work.carl..."
    if ! carl_update_active_work_references "$old_intent_path"; then
        update_success=false
    fi
    echo
    
    # Update state file references if state file was moved
    if [ -n "$old_state_path" ] && [ -n "$new_state_path" ]; then
        echo "### Updating state file references..."
        if ! carl_update_state_file_references "$old_intent_path" "$new_intent_path"; then
            update_success=false
        fi
        echo
    fi
    
    # Update intent cross-references
    echo "### Updating intent cross-references..."
    if ! carl_update_intent_cross_references "$old_intent_path" "$new_intent_path"; then
        update_success=false
    fi
    echo
    
    # Validate reference integrity
    echo "### Validating reference integrity..."
    if ! carl_validate_reference_integrity; then
        update_success=false
    fi
    echo
    
    if [ "$update_success" = true ]; then
        echo "SUCCESS: Reference integrity update completed successfully"
        return 0
    else
        echo "ERROR: Reference integrity update encountered errors"
        return 1
    fi
}

# ==========================================
# Story 4: Workflow Integration and Session Management
# ==========================================

# Trigger organization check during task completion workflow
carl_workflow_trigger_organization() {
    local task_context="${1:-}"
    local operation_type="${2:-task_completion}"
    local carl_root="$(carl_get_root)"
    
    echo "## CARL Workflow Organization Trigger"
    echo "Operation: $operation_type"
    echo "Context: ${task_context:-automatic}"
    echo "Timestamp: $(date -Iseconds)"
    echo
    
    local organization_success=true
    local organized_count=0
    local error_count=0
    
    # Check if organization system is available
    if ! command -v carl_scan_for_completed_work >/dev/null 2>&1; then
        echo "WARNING: Organization system not available - skipping"
        return 0
    fi
    
    # Execute organization workflow with timeout protection
    echo "### Scanning for completed work..."
    local scan_results_file="/tmp/workflow_org_$(date +%s).tmp"
    
    if timeout 30s carl_find_completed_files "all" > "$scan_results_file" 2>&1; then
        if [ -s "$scan_results_file" ]; then
            echo "Found completed items for organization"
            
            # Process completed items
            while IFS='|' read -r intent_file state_file completion_status; do
                if [ "$completion_status" = "aligned_completion" ]; then
                    echo "Processing: $(basename "$intent_file")"
                    
                    # Move file pair
                    if carl_move_completed_file_pair "$intent_file" "$state_file"; then
                        # Update references
                        local old_intent="$intent_file"
                        local new_intent="${intent_file/\/stories\//\/stories\/completed\/}"
                        new_intent="${new_intent/\/features\//\/features\/completed\/}"
                        new_intent="${new_intent/\/epics\//\/epics\/completed\/}"
                        new_intent="${new_intent/\/technical\//\/technical\/completed\/}"
                        
                        local old_state="$state_file"
                        local new_state="${state_file/\/stories\//\/stories\/completed\/}"
                        new_state="${new_state/\/features\//\/features\/completed\/}"
                        new_state="${new_state/\/epics\//\/epics\/completed\/}"
                        new_state="${new_state/\/technical\//\/technical\/completed\/}"
                        
                        if carl_update_all_references "$old_intent" "$new_intent" "$old_state" "$new_state" >/dev/null 2>&1; then
                            organized_count=$((organized_count + 1))
                            echo "SUCCESS: Organized $(basename "$intent_file")"
                        else
                            echo "WARNING: Reference update failed for $(basename "$intent_file")"
                            error_count=$((error_count + 1))
                            organization_success=false
                        fi
                    else
                        echo "WARNING: File movement failed for $(basename "$intent_file")"
                        error_count=$((error_count + 1))
                        organization_success=false
                    fi
                fi
            done < "$scan_results_file"
        else
            echo "No completed items found - organization not needed"
        fi
    else
        echo "WARNING: Organization scan timed out or failed"
        organization_success=false
        error_count=$((error_count + 1))
    fi
    
    # Cleanup
    rm -f "$scan_results_file" 2>/dev/null
    
    # Report results
    echo
    echo "### Organization Summary:"
    echo "- Items organized: $organized_count"
    echo "- Errors encountered: $error_count"
    echo "- Overall status: $([ "$organization_success" = true ] && echo "SUCCESS" || echo "PARTIAL SUCCESS")"
    
    # Log operation summary (no static file update needed - status is now dynamic)
    
    # Always return success to avoid disrupting workflow
    return 0
}

# Session end organization cleanup
carl_session_end_organization() {
    local session_context="${1:-session_cleanup}"
    local carl_root="$(carl_get_root)"
    
    echo "## CARL Session End Organization Cleanup"
    echo "Session: $session_context"
    echo "Timestamp: $(date -Iseconds)"
    echo
    
    # Perform final organization sweep
    echo "### Final organization sweep..."
    carl_workflow_trigger_organization "$session_context" "session_end"
    
    # Cleanup temporary files
    echo "### Cleaning up organization temporary files..."
    find /tmp -name "carl_*$(date +%Y%m%d)*" -type f -mmin +60 -delete 2>/dev/null || true
    find /tmp -name "*_backup_*$(date +%Y%m%d)*" -type f -mmin +60 -delete 2>/dev/null || true
    
    # Validate final state
    echo "### Validating final reference integrity..."
    if carl_validate_reference_integrity >/dev/null 2>&1; then
        echo "SUCCESS: Reference integrity maintained"
    else
        echo "WARNING: Reference integrity issues detected - manual review recommended"
    fi
    
    echo "Session end organization cleanup completed"
    return 0
}

# Get dynamic organization status (replaces static status file)
carl_get_organization_status() {
    local carl_root="$(carl_get_root)"
    local timestamp=$(date -Iseconds)
    
    # Count completed items dynamically
    local completed_stories=$(find "$carl_root/.carl/project/stories/completed" -name "*.intent.carl" 2>/dev/null | wc -l)
    local completed_features=$(find "$carl_root/.carl/project/features/completed" -name "*.intent.carl" 2>/dev/null | wc -l)
    local completed_epics=$(find "$carl_root/.carl/project/epics/completed" -name "*.intent.carl" 2>/dev/null | wc -l)
    local completed_technical=$(find "$carl_root/.carl/project/technical/completed" -name "*.intent.carl" 2>/dev/null | wc -l)
    local total_completed=$((completed_stories + completed_features + completed_epics + completed_technical))
    local total_files=$(find "$carl_root/.carl/project"/*/completed -name "*.carl" 2>/dev/null | wc -l)
    
    # Check system operational status
    local system_status="operational"
    if [ ! -d "$carl_root/.carl/project/stories/completed" ]; then
        system_status="not_configured"
    fi
    
    # Get last organization time from newest file in completed directories
    local last_organization="unknown"
    local newest_file=$(find "$carl_root/.carl/project"/*/completed -name "*.carl" -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    if [ -n "$newest_file" ]; then
        last_organization=$(stat -c '%y' "$newest_file" 2>/dev/null || echo "unknown")
    fi
    
    # Output dynamic status
    cat << EOF
## CARL Organization Status (Dynamic)
Generated: $timestamp

organization_summary:
  completed_stories: $completed_stories
  completed_features: $completed_features  
  completed_epics: $completed_epics
  completed_technical: $completed_technical
  total_completed_items: $total_completed
  total_files_in_completed: $total_files

system_health:
  organization_system: "$system_status"
  completed_directories_exist: $([ -d "$carl_root/.carl/project/stories/completed" ] && echo "true" || echo "false")
  last_organization_activity: "$last_organization"

workflow_integration:
  status: "active"
  performance_impact: "minimal"
  error_handling: "graceful_degradation"
EOF
}

# Check if organization is needed and safe to perform
carl_check_organization_readiness() {
    local carl_root="$(carl_get_root)"
    local readiness_issues=0
    
    # Check if CARL root is accessible
    if [ ! -d "$carl_root" ]; then
        echo "ERROR: CARL root directory not accessible"
        return 1
    fi
    
    # Check if required functions are available
    local required_functions=("carl_find_completed_files" "carl_move_completed_file_pair" "carl_update_all_references")
    for func in "${required_functions[@]}"; do
        if ! command -v "$func" >/dev/null 2>&1; then
            echo "WARNING: Required function $func not available"
            readiness_issues=$((readiness_issues + 1))
        fi
    done
    
    # Check system load (avoid organization during high load)
    if command -v uptime >/dev/null 2>&1; then
        local load_avg=$(uptime | grep -o 'load average:.*' | cut -d: -f2 | cut -d, -f1 | tr -d ' ')
        if [ -n "$load_avg" ] && [ "$(echo "$load_avg > 2.0" | bc 2>/dev/null || echo 0)" -eq 1 ]; then
            echo "WARNING: High system load ($load_avg) - deferring organization"
            readiness_issues=$((readiness_issues + 1))
        fi
    fi
    
    # Check disk space
    local disk_usage=$(df "$carl_root" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        echo "WARNING: Low disk space (${disk_usage}% used) - deferring organization"
        readiness_issues=$((readiness_issues + 1))
    fi
    
    if [ "$readiness_issues" -eq 0 ]; then
        echo "Organization readiness: READY"
        return 0
    else
        echo "Organization readiness: NOT READY ($readiness_issues issues)"
        return 1
    fi
}

# Integrate organization trigger into existing workflows
carl_integrate_workflow_organization() {
    local integration_type="${1:-auto}"
    local carl_root="$(carl_get_root)"
    
    echo "## CARL Workflow Organization Integration"
    echo "Integration type: $integration_type"
    echo "Timestamp: $(date -Iseconds)"
    echo
    
    # Check readiness
    if ! carl_check_organization_readiness; then
        echo "Organization not ready - skipping integration"
        return 0
    fi
    
    # Trigger organization based on integration type
    case "$integration_type" in
        "task_completion"|"auto")
            echo "### Task completion integration..."
            carl_workflow_trigger_organization "task_workflow" "task_completion"
            ;;
        "session_end")
            echo "### Session end integration..."
            carl_session_end_organization "workflow_integration"
            ;;
        "periodic")
            echo "### Periodic integration..."
            carl_workflow_trigger_organization "periodic_check" "periodic"
            ;;
        *)
            echo "### Default integration..."
            carl_workflow_trigger_organization "$integration_type" "default"
            ;;
    esac
    
    echo "Workflow organization integration completed"
    return 0
}