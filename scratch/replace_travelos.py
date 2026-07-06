import os
import re

def process_directory(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts')) and file != 'use-brand.ts':
                filepath = os.path.join(root, file)
                process_file(filepath)

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return

    # Check if we have any Turis mentions
    if not re.search(r'Turis|Turis OS', content, re.IGNORECASE):
        return

    # Don't replace inside .agent/rules or implementation plan
    if '.agent' in filepath or 'scratch' in filepath or 'DESIGN' in filepath or 'task.md' in filepath:
        return

    print(f"Checking {filepath}")

    # Very naive heuristic: 
    # If the file has Turis in standard text inside components, we could do dynamic.
    # But since doing full AST parsing is hard here, we might just list them 
    # and provide a manual checklist or use a safe regex for JSX text nodes.
    # Actually, for an MVP of Phase 0, we'll replace strings in critical places or just log them 
    # for the agent to review. Let's just log them and see exactly what needs to be changed.
    
    matches = re.finditer(r'(.{0,40})(Travel\s*OS)(.{0,40})', content, re.IGNORECASE)
    for match in matches:
        print(f"  ... {match.group(1).strip()} >>>{match.group(2)}<<< {match.group(3).strip()}")

if __name__ == "__main__":
    process_directory('src')
