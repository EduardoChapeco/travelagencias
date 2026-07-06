import re

def refactor():
    path = r"c:\Users\Eduardo Antônio Ramo\Music\travelagencias\src\components\portal\BlockRenderer.tsx"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add useQuery import if missing
    if "useQuery" not in content:
        content = content.replace(
            'import { Link } from "@tanstack/react-router";',
            'import { Link } from "@tanstack/react-router";\nimport { useQuery } from "@tanstack/react-query";'
        )

    # 2. Refactor specific known blocks using regex
    # Example 1: TourHighlights, GroupTourDetailsBlock, etc where state is 'tour' and dependency is 'block.tour_id'
    
    # Let's find all patterns of:
    # const [STATE, setSTATE] = useState<TYPE>(INITIAL);
    # const [loading, setLoading] = useState(true);
    # useEffect(() => { async function load() { ... } load(); }, [DEPS]);
    
    pattern = re.compile(
        r'const \[([a-zA-Z0-9_]+), set[a-zA-Z0-9_]+\] = useState(?:<[^>]+>)?\((.*?)\);\s*'
        r'const \[loading, setLoading\] = useState\(true\);\s*'
        r'useEffect\(\(\) => \{\s*'
        r'async function load\(\) \{\s*'
        r'(.*?)\s*'
        r'\}\s*'
        r'load\(\);\s*'
        r'\}, \[(.*?)\]\);',
        re.DOTALL
    )

    def repl(m):
        state_name = m.group(1)
        initial_val = m.group(2)
        load_body = m.group(3)
        deps = m.group(4)

        # Extract the supabase query from load_body
        # We need to turn the load_body into a queryFn.
        # Inside load_body, there are usually early returns like:
        # if (!block.tour_id) { setLoading(false); return; }
        
        # Replace setLoading(false) with nothing, and setSTATE(data) with nothing (just return data)
        query_fn_body = load_body
        query_fn_body = re.sub(r'setLoading\(.*?\);', '', query_fn_body)
        query_fn_body = re.sub(rf'set{state_name.capitalize()}\((.*?)\);', r'return \1;', query_fn_body)
        query_fn_body = re.sub(r'return;', 'return null;', query_fn_body)
        
        # Format the useQuery hook
        return f"""const {{ data: {state_name}, isLoading: loading }} = useQuery({{
    queryKey: ['block-data', {deps}],
    queryFn: async () => {{
      {query_fn_body}
    }},
    enabled: !!({deps.split(',')[0].strip()})
  }});"""

    new_content, count = pattern.subn(repl, content)
    
    # For some blocks the loading state might be called 'isLoading', but the pattern matches 'loading'
    print(f"Replaced {count} useEffect blocks.")

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)

if __name__ == "__main__":
    refactor()
