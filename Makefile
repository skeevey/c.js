# Mostly lifted from https://andreypopp.com/posts/2013-05-16-makefile-recipes-for-node-js.html
# Thanks @andreypopp

export BIN := $(shell npm bin)
export NODE_ENV = test
BABEL = $(BIN)/babel
ISTANBUL = $(BIN)/babel-istanbul cover
MOCHA = $(BIN)/mocha
_MOCHA = $(BIN)/_mocha
UGLIFY = $(BIN)/uglifyjs
WEBPACK = $(BIN)/webpack
TEST = $(wildcard test/spec/*.js)
SRC = $(wildcard src/*.js)
LIB = $(SRC:src/%=lib/%)
DIST = dist
DISTOUT = $(DIST)/c.js
MIN = $(DIST)/c.min.js

.PHONY: test dev build clean

clean:
	rm $(DISTOUT) $(MIN) $(LIB)

build: $(LIB) $(DISTOUT) $(MIN)

# Allows usage of `make install`, `make link`
install link:
	@npm $@

$(LIB): $(SRC) $(BIN)
	@$(BABEL) src --out-dir lib

$(MIN): $(DISTOUT) $(BIN)
	@$(UGLIFY) $< \
	  --output $@ \
	  --source-map $@.map \
	  --source-map-url $(basename $@.map) \
	  --in-source-map $<.map \
	  --compress warnings=false

$(DISTOUT): $(BIN)
	@$(WEBPACK) --devtool source-map

test: $(LIB) $(DISTOUT) $(BIN)
	@$(MOCHA) test/spec/*.js

coverage: build $(BIN)
	$(ISTANBUL) $(_MOCHA) -- $(TEST); \
	status=$$?; \
	exit $$status

clean-coverage:
	rm -rf coverage


node_modules/.bin: install

define release
	VERSION=`node -pe "require('./package.json').version"` && \
	NEXT_VERSION=`node -pe "require('semver').inc(\"$$VERSION\", '$(1)')"` && \
	node -e "\
		['./package.json', './bower.json'].forEach(function(fileName) {\
			var j = require(fileName);\
			j.version = \"$$NEXT_VERSION\";\
			var s = JSON.stringify(j, null, 2);\
			require('fs').writeFileSync(fileName, s);\
		});" && \
	git add package.json CHANGELOG.md && \
	git add -f dist/ && \
	git commit -m "release v$$NEXT_VERSION" && \
	git tag "v$$NEXT_VERSION" -m "release v$$NEXT_VERSION"
endef

release-patch: test clean build
	@$(call release,patch)

release-minor: test clean build
	@$(call release,minor)

release-major: test clean build
	@$(call release,major)

# publish: clean build
# 	git push --tags origin HEAD:master
# 	npm publish
