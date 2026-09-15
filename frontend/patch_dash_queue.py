import os
import re

def patch():
    file_path = 'src/pages/Dashboard.jsx'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = r'(<motion\.div\s*key=\{hab\.habitation_id\}.*?)(style=\{\{.*?\}\})(\s*>)'
    
    def replacer(match):
        prefix = match.group(1)
        style_block = match.group(2)
        suffix = match.group(3)
        
        inner_style = style_block.replace('style={{', 'style={{\n                              position: "relative", zIndex: 10,')
        
        new_motion = prefix + 'style={{ cursor: "pointer", overflow: "hidden", borderRadius: "12px", borderLeft: `4px solid ${bandColor}` }}' + suffix
        new_motion += f'\n                            <MagicCard gradientColor="rgba(255,255,255,0.1)" className="w-full h-full">\n                            <div {inner_style}>'
        return new_motion

    new_content = re.sub(pattern, replacer, content, flags=re.DOTALL)
    
    old_end = """                            </div>
                          </motion.div>
                        );"""
    
    new_end = """                            </div>
                            </div>
                            </MagicCard>
                          </motion.div>
                        );"""
                        
    new_content = new_content.replace(old_end, new_end)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
patch()
