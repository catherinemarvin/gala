import sys, parser_generator, grammar_parser, bytecode_compiler
import pprint
import json
import web

urls = (
    '/test', 'testBuildAst',
    '/', 'buildAst'
    )

app = web.application(urls, globals())

class testBuildAst:
  def GET(self):
    i = web.input()
    code = i.code
    parser = parser_generator.makeParser(grammar_parser.parse(open('./galaC.grm').read()))
    ast = parser.parse(code)
    desugaredE = bytecode_compiler.desugar(ast)
    return json.dumps(desugaredE)

class buildAst:
  def GET(self):
    i = web.input()
    code = i.code
    callback = i.jsoncallback
    print callback
    print code
    parser = parser_generator.makeParser(grammar_parser.parse(open('./galaC.grm').read()))
    ast = parser.parse(code)
    desugaredE = bytecode_compiler.desugar(ast)
    web.header('Content-Type', 'application/javascript') 
    return "%s(%s)" % (callback, json.dumps(desugaredE)) 


if __name__ == "__main__":
    app.run()
