# Contributing to NotionVault

Thank you for your interest in contributing to NotionVault! We welcome contributions from the community to help improve this password manager.

## Code of Conduct

This project follows a code of conduct to ensure a welcoming environment for all contributors. Please be respectful and considerate in your interactions.

## How to Contribute

### Reporting Issues
- Use the GitHub issue tracker to report bugs or request features
- Provide detailed information including steps to reproduce
- Include your environment (OS, Python version, etc.)

### Contributing Code

1. **Fork the Repository**
   ```bash
   git clone https://github.com/abm1119/password-manager-vault.git
   cd notionvault
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/issue-number
   ```

3. **Set Up Development Environment**
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt  # if available
   ```

4. **Make Your Changes**
   - Follow the existing code style
   - Write clear, concise commit messages
   - Add tests for new features
   - Update documentation as needed

5. **Test Your Changes**
   ```bash
   # Run tests
   python -m pytest

   # Check code formatting
   black --check .

   # Run linter
   flake8 .
   ```

6. **Commit and Push**
   ```bash
   git add .
   git commit -m "Add: brief description of changes"
   git push origin feature/your-feature-name
   ```

7. **Submit a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Ensure all CI checks pass

## Development Guidelines

### Code Style
- Follow PEP 8 guidelines
- Use Black for code formatting
- Write docstrings for functions and classes
- Use type hints where appropriate

### Testing
- Write unit tests for new features
- Ensure all existing tests pass
- Aim for good test coverage

### Documentation
- Update README.md for significant changes
- Add docstrings to new functions
- Update API documentation if endpoints change

### Security
- Never commit sensitive information
- Be careful with encryption implementations
- Report security vulnerabilities privately

## Areas for Contribution

### High Priority
- Additional encryption methods
- Password strength checker
- Import/export functionality
- Mobile responsiveness improvements

### Medium Priority
- Multi-factor authentication
- Password generator improvements
- Theme customization
- Plugin system

### Low Priority
- Internationalization (i18n)
- Accessibility improvements
- Performance optimizations
- Additional UI frameworks

## Getting Help

- Check existing issues and documentation first
- Join our community discussions
- Contact maintainers for guidance

Thank you for helping make NotionVault better! 🚀</content>
</xai:function_call">Successfully created file f:/Ideas/Password Manager App/CONTRIBUTING.md
