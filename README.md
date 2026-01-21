# MMINTAH247 Homelab Documentation

> **A comprehensive knowledge base for my homelab infrastructure, services, and configurations.**

This repository contains the source documentation for my homelab setup, covering everything from server management to containerization workflows. Built with MkDocs and the Material theme, it provides searchable, version-controlled documentation that grows alongside the infrastructure.

🌐 **Live Documentation**: [homelab.mmintah247.com](https://www.homelab.mmintah247.com)

## Who can use this?

- **Homelab enthusiasts** looking for reference implementations and best practices
- **DevOps engineers** exploring self-hosted infrastructure solutions
- **Students and learners** interested in server management and containerization
- **Anyone** building or maintaining their own homelab environment

## Quick start

```bash
python -m venv .venv && source .venv/bin/activate
pip install mkdocs-material
mkdocs serve
```

or

Kill existing process and run

```bash
lsof -t -i :8000 | xargs kill && mkdocs build --clean && mkdocs serve
```

Open http://127.0.0.1:8000 to view the site.
