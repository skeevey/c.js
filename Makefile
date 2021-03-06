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
	rm $(DIST)/* $(LIB) || true

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

$(DISTOUT): $(LIB) $(BIN)
	@$(WEBPACK) --devtool source-map

test: $(LIB) $(BIN)
	@$(MOCHA) test/spec/*.js

benchmark: $(LIB) $(BIN)
	node ./benchmark/deserialize
	node ./benchmark/serialize

benchmark-deopt: $(LIB) $(BIN)
	node --trace-deopt ./benchmark/deserialize
	node --trace-deopt ./benchmark/serialize

benchmark-deopt-verbose: $(LIB) $(BIN)
	node --trace-deopt --print-opt-code --code-comments ./benchmark/deserialize
	node --trace-deopt --print-opt-code --code-comments ./benchmark/serialize

generate-irhydra: $(LIB) $(BIN)
	node --trace-hydrogen \
		--trace-phase=Z \
		--trace-deopt \
		--code-comments \
		--hydrogen-track-positions \
		--redirect-code-traces \
		--redirect-code-traces-to=code.asm \
		--print-opt-code \
		./benchmark/deserialize

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
		['./package.json'].forEach(function(fileName) {\
			var j = require(fileName);\
			j.version = \"$$NEXT_VERSION\";\
			var s = JSON.stringify(j, null, 2);\
			require('fs').writeFileSync(fileName, s);\
		});" && \
	git add package.json CHANGELOG.md && \
	git add -f dist/ lib/ && \
	git commit -m "release v$$NEXT_VERSION" && \
	git tag "v$$NEXT_VERSION" -m "release v$$NEXT_VERSION"
endef

release-patch: clean build test
	@$(call release,patch)

release-minor: clean build test
	@$(call release,minor)

release-major: clean build test
	@$(call release,major)

# publish: clean build
# 	git push --tags origin HEAD:master
# 	npm publish
