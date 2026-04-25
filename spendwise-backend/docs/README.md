# Backend documentation (Sphinx)

This folder hosts the technical documentation for the SpendWise backend,
generated with [Sphinx](https://www.sphinx-doc.org/). The source files
live in `source/` and the HTML output is built into `_build/html/` (which
is git-ignored).

## Building the documentation locally

1. From the backend root, install the project dependencies (they already
   include Sphinx and the Read the Docs theme):

   ```bash
   cd spendwise-backend
   pip install -r requirements.txt
   ```

2. Build the HTML documentation:

   ```bash
   cd docs
   make html        # Linux / macOS
   .\make.bat html  # Windows
   ```

3. Open the result in your browser:

   ```text
   spendwise-backend/docs/_build/html/index.html
   ```

## Source layout

- `source/conf.py`: Sphinx project configuration (extensions, theme,
  import paths, autodoc options).
- `source/index.rst`: landing page and top-level table of contents.
- `source/installation.rst`: backend setup and run instructions.
- `source/architecture.rst`: high-level overview of the service layout.
- `source/api/`: API reference extracted from the docstrings of each
  package.

## Maintenance

When new modules or services are added to the backend, create a matching
`.rst` file under `source/api/` and link it from the `toctree` in
`source/api/index.rst`. Google-style docstrings are rendered automatically
by the `napoleon` extension.
