#!/bin/sh

# v1.0.0 originally installed a desktop entry whose filename contained a
# space. Remove it before installing the standards-compliant replacement.
rm -f "/usr/share/applications/Markdown Viewer.desktop"

exit 0
