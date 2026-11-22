.PHONY: run build test check

run: build
	python3 server.py

build:
	pnpm build

test:
	python3 -m unittest discover -s tests -v

check:
	python3 -m py_compile server.py cgo/bio.py
	node --check web/app.js
	pnpm build
	git diff --check
