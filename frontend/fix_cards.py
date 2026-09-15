import os
import re

def fix_cards_and_buttons(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()

    # 1. Add MagicCard import if missing
    if 'MagicCard' not in code:
        code = code.replace(
            'import { API_BASE_URL',
            'import { MagicCard } from "@/components/ui/magic-card";\nimport { API_BASE_URL'
        )

    # 2. Fix the broken MagicCard closing tags (if any) that caused the build error
    # Instead of manual regex, let's just make sure <MagicCard> ... </MagicCard> surrounds the panels
    # Wait, the build error was "Expected corresponding JSX closing tag for 'MagicCard'."
    # "Expected `</MagicCard>` at 302:7"
    # This means I injected <MagicCard> but didn't close it properly, or closed it in the wrong place.
    pass
