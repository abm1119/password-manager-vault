from ttkbootstrap import Style

# Set the ttkbootstrap theme - 'superhero' for a dark, premium look
style = Style(theme='superhero')

# 🎨 Color Palette (adapted for ttkbootstrap)
colors = {
    "bg_dark": "#2b3e50",  # Dark background
    "bg_dark_alt": "#34495e",  # Slightly lighter
    "bg_light": "#566573",  # Light panels
    "border": "#85929e",  # Borders
    "text_primary": "#ecf0f1",  # Primary text
    "text_secondary": "#bdc3c7",  # Secondary text
    "accent": "#3498db",  # Accent blue
    "accent_alt": "#e74c3c",  # Red accent
    "success": "#2ecc71",  # Green
    "warning": "#f39c12",  # Orange
    "danger": "#e74c3c",  # Red
    "info": "#17a2b8",  # Teal
}

# 🔤 Typography scale
fonts = {
    "title": ("Helvetica", 24, "bold"),  # Main title
    "header": ("Helvetica", 18, "bold"),  # Section headers
    "subheader": ("Helvetica", 16, "bold"),  # Sub-section headers
    "body": ("Helvetica", 12, "normal"),  # Body text
    "small": ("Helvetica", 10, "normal"),  # Fine print
    "tiny": ("Helvetica", 8, "normal"),  # Very small text
}

# 💬 Inspirational Security Quotes
security_quotes = [
    "The only system which is truly secure is one which is switched off and unplugged.",
    "Security is not a product, but a process.",
    "Privacy is not something that I'm merely entitled to, it's an absolute prerequisite.",
    "If you think technology can solve your security problems, then you don't understand the problems and you don't understand the technology.",
    "The more you know about security, the more insecure you feel.",
    "Security is always excessive until it's not enough.",
    "The weakest link in the security chain is the human element.",
    "Passwords are like underwear: don't let people see it, change it often, and don't share it with strangers.",
    "Security is a process, not a product.",
    "The best security is the one that's invisible to the user.",
]

def apply_bootstrap_theme():
    # Additional customizations can be added here if needed
    pass
