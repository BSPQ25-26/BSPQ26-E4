"""Sphinx project configuration for the SpendWise backend.

This file is read by Sphinx whenever a build target runs (e.g. ``make
html``). It declares project metadata, the extensions to load, the HTML
theme, and the import path so the ``autodoc`` extension can pull
docstrings from the backend source code.

Reference for the available options:
https://www.sphinx-doc.org/en/master/usage/configuration.html
"""

import os
import sys


# ---------------------------------------------------------------------------
# Path setup
# ---------------------------------------------------------------------------
# Sphinx runs from ``docs/`` but the modules to document live in the backend
# root (../..). Adding that path to ``sys.path`` lets autodoc resolve
# imports such as ``import app.main`` or ``import services.expenses.routes``.
sys.path.insert(0, os.path.abspath("../.."))


# ---------------------------------------------------------------------------
# Project information
# ---------------------------------------------------------------------------
project = "SpendWise Backend"
author = "SpendWise Team — BSPQ26-E4"
copyright = "2026, SpendWise Team"

# Short version (shown in the side menu) and full release string.
version = "1.0"
release = "1.0.0"

# Primary language. Affects Sphinx-generated text such as index headings
# and the search page.
language = "en"


# ---------------------------------------------------------------------------
# Extensions
# ---------------------------------------------------------------------------
# Each extension adds one specific capability:
#   - autodoc: pulls docstrings from the project's Python modules.
#   - napoleon: lets us write docstrings in Google or NumPy style (more
#     readable than raw reST).
#   - viewcode: adds a "[source]" link next to each documented item so the
#     source can be browsed straight from the rendered docs.
#   - intersphinx: cross-links references to the official Python docs.
#
# We deliberately do not use ``sphinx-autodoc-typehints``. That extension
# tries to expand the docstring of every type referenced in a signature,
# and FastAPI's classes (APIRouter, Depends, ...) ship Markdown docstrings
# that docutils cannot parse cleanly, producing noisy build warnings.
# The built-in ``autodoc_typehints`` option below covers our needs.
extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.napoleon",
    "sphinx.ext.viewcode",
    "sphinx.ext.intersphinx",
]


# ---------------------------------------------------------------------------
# autodoc / napoleon options
# ---------------------------------------------------------------------------
# Defaults applied to every autodoc directive (``automodule``, ``autoclass``,
# ...) unless overridden in a specific .rst file.
autodoc_default_options = {
    "members": True,            # Document every public member.
    "show-inheritance": True,   # Show base classes in class entries.
    "undoc-members": False,     # Hide members that have no docstring.
    # Internal plumbing exposed at module level (FastAPI ``APIRouter`` and
    # ``HTTPBearer`` instances). They are an implementation detail and
    # rendering their third-party class docstrings produces noisy RST
    # parsing warnings, since FastAPI uses Markdown-style docstrings.
    "exclude-members": "router, security",
}

# A couple of dependencies (Supabase and python-dotenv) execute code at
# import time and rely on environment variables that are not available
# during the doc build. We mock them so autodoc can import the modules
# without crashing; everything else (FastAPI, Pydantic, ...) is installed
# via requirements.txt and imported normally.
autodoc_mock_imports = [
    "supabase",
    "dotenv",
]

# Render type annotations next to each parameter description (and the
# return type as ``:rtype:``) instead of stuffing them into the
# function signature. Produces a more readable layout, especially for
# functions whose annotations are long.
autodoc_typehints = "description"
autodoc_typehints_format = "short"

# Docstring style. Enable Google only (more readable) and explicitly turn
# off NumPy to avoid mixed formats sneaking in.
napoleon_google_docstring = True
napoleon_numpy_docstring = False
napoleon_include_init_with_doc = False
napoleon_include_private_with_doc = False
napoleon_use_param = True
napoleon_use_rtype = True
# Render the ``Attributes:`` section using ``:ivar:`` directives instead of
# stand-alone ``.. attribute::`` blocks. This avoids duplicate cross-reference
# warnings against the autodoc-generated entries for Pydantic fields.
napoleon_use_ivar = True

# Display short names instead of the full module path on each entry.
add_module_names = False


# ---------------------------------------------------------------------------
# Intersphinx
# ---------------------------------------------------------------------------
# Allows cross-references to types in the Python standard library to link
# to docs.python.org instead of being plain text.
intersphinx_mapping = {
    "python": ("https://docs.python.org/3", None),
}


# ---------------------------------------------------------------------------
# Templates and excluded files
# ---------------------------------------------------------------------------
templates_path = ["_templates"]
exclude_patterns: list[str] = []


# ---------------------------------------------------------------------------
# HTML output
# ---------------------------------------------------------------------------
# Read the Docs theme: side navigation tree, search box, clean styling.
# Shipped by the sphinx-rtd-theme package.
html_theme = "sphinx_rtd_theme"
html_static_path = ["_static"]

# Short title shown in the browser tab.
html_title = f"{project} {release}"
