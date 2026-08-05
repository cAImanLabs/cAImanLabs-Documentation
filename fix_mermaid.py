import os
import glob

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Simple replacement: look for ```mermaid and replace with <pre class="mermaid">
    # Then look for the next ``` and replace with </pre>
    
    parts = content.split('```mermaid\n')
    if len(parts) == 1:
        return
        
    new_content = parts[0]
    for part in parts[1:]:
        new_content += '<pre class="mermaid">\n'
        subparts = part.split('```\n', 1)
        if len(subparts) > 1:
            new_content += subparts[0] + '</pre>\n' + subparts[1]
        else:
            # Maybe the file ends with ``` without newline
            subparts = part.split('```')
            new_content += subparts[0] + '</pre>' + (subparts[1] if len(subparts)>1 else "")
            
    with open(filepath, 'w') as f:
        f.write(new_content)
    print(f"Fixed {filepath}")

for filepath in glob.glob('src/content/docs/**/*.md', recursive=True):
    fix_file(filepath)

