# Minimal Makefile to build the Sphinx documentation.
#
# Typical usage:
#   make html      -> build the HTML documentation under _build/html
#   make clean     -> wipe everything under _build/
#   make help      -> list every output format Sphinx supports
#
# Requires the backend dependencies to be installed; the requirements file
# already pins Sphinx and the Read the Docs theme.

# Variables Sphinx expects. They can be overridden from the command line,
# e.g. `make html SPHINXOPTS="-W"` to treat warnings as errors.
SPHINXOPTS    ?=
SPHINXBUILD   ?= sphinx-build
SOURCEDIR      = source
BUILDDIR       = _build

# Default target: print Sphinx's built-in help.
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: help Makefile

# Catch-all: any target that does not match an explicit rule is delegated
# to `sphinx-build -M`. This lets us support `make html`, `make latexpdf`,
# and any other format Sphinx ships with.
%: Makefile
	@$(SPHINXBUILD) -M $@ "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)
