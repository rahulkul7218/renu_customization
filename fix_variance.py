js_path = '/home/rahul/frappe-bench/apps/renu_customization/renu_customization/renu_customization/page/ytd_profit_and_loss_/ytd_profit_and_loss_.js'

with open(js_path, 'r') as f:
    lines = f.readlines()

new_content = []
i = 0
fixed_count = 0

while i < len(lines):
    line = lines[i]
    # Detect the PDF export varVal block (uses src.var_val, not source.var_val)
    if 'varVal = src.var_val > 0 ? src.var_val.toFixed(2)' in line:
        stripped = line.lstrip()
        indent = line[:len(line) - len(stripped)]
        # Replace the single line with millions conversion
        new_content.append(indent + "const varMilPdf = parseFloat(src.var_val) / 1000000;\n")
        new_content.append(indent + "varVal = varMilPdf > 0 ? varMilPdf.toFixed(2) : varMilPdf === 0 ? '0.00' : '(' + Math.abs(varMilPdf).toFixed(2) + ')';\n")
        i += 1
        fixed_count += 1
        print('Fixed PDF export varVal line')
    else:
        new_content.append(line)
        i += 1

with open(js_path, 'w') as f:
    f.writelines(new_content)

print('Done. Fixed', fixed_count, 'block(s). Total lines:', len(new_content))
