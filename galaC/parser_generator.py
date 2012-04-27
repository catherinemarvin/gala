import grammar, grammar_parser, re, sys, types, util, collections, pprint, StringIO, copy
from util import Ambiguous
debug = False

##-----------------------------------------------------------------------------
## Module interface
##

def makeRecognizer (gram, type='earley'):
    '''Construct and return a "recognizer" of GRAM.

    A recognizer is an object with a method recognize(inp), returning
    True if INP is a valid string in GRAM, and False otherwise.
    '''
    class Recognizer:
        def __init__ (self, parser):
            self.parser = parser

        def dump (self, f=sys.stdout):
            self.parser.dump (f)
        
        def recognize (self, inp):
            if self.parser.parse(inp):
                return True
            return False

    return Recognizer (makeParser (gram, type))


def makeParser (gram, type='earley', emit=False):
    '''Construct and return a parser of GRAM.

    A parser is an object with a method parse(inp), returning the AST
    constructed from the parse tree of INP by the semantic actions in GRAM.
    '''
    if type == 'earley':
        return EarleyParser (gram, emit)
    else:
        raise TypeError, 'Unknown parser type specified'

##-----------------------------------------------------------------------------
## Parse Tree representation
class ParseTreeNode:
    def __init__(self, symbol, actions=[None], children = [], value = None):
        self.val = value
        self.inh = None
        self.symbol = symbol
        self.actions = actions
        self.children = children
        
    def evaluate(self):
        for i, child in enumerate(self.children):
            if self.actions[i]:
                self.actions[i] (self, *(self.children))
            child.evaluate()
        if self.actions[-1]:
            self.val = self.actions[-1](self, *(self.children))
        elif self.symbol:
            self.val = self.children[0].val
        
        return self.val
        
    def dump(self, out=sys.stdout, level = 0):
        if not self.symbol:
            print >>out, '%s"%s"'%(' '*level*2, self.val)
        else:
            print >>out, '%s(%s'%(' '*level*2, self.symbol)
            for child in self.children:
                child.dump (out, level + 1)
            print >>out, '%s) '% (' '*level*2)
    
    

##-----------------------------------------------------------------------------
## Earley Parser
##
class EarleyParser:
    '''A parser implementing the Earley algorithm.'''

    def __init__ (self, gram, emit):
        '''Create a new Earley parser.'''
        self.grammar = gram
        self.emit = emit
        self.terminals, self.invRenamedTerminals = self.preprocess(self, gram, emit)
        
        # self.dump()
    def parse(self, inp):
        try:
            tokens = self.tokenize(inp)
            TOKEN = 0; LEXEME = 1
        except Exception, pos:
            util.error ('Lexical error. Cannot tokenize "at pos %s. Context: '\
                        ' %s"'% (pos, inp[pos[0]:pos[0]+24]))
            return 'Error'
        
        SRC = 0; DST = 1; PROD = 2; POS = 3
        COMPLETE = 0; INPROGRESS = 1
        CHILDREN = 0; PRODUCTION = 1
        
        graph = collections.defaultdict(lambda: ([],\
                                        collections.defaultdict(list)))
            
        parseTree = {}
        
        def printEdge(e):
            print e[0], e[1]
            print e[2].toString(self.invRenamedTerminals),
            print e[3]
            
        def edgesIncomingTo(dst, klass):
            return copy.copy(_edgesIncomingTo(dst,klass)[0])
            
        def _edgesIncomingTo(dst,klass):
            key = (dst, klass)
            return graph[key]
            
        edgeWasInserted = [False]
        def addEdge(e, funChildren):
            (src, dst, p, pos) = e
            status = COMPLETE if len(p.RHS)==pos else INPROGRESS
            (edgeList, edgeHash) = _edgesIncomingTo(dst, status)
            
            if status == INPROGRESS:
                if e not in edgeHash[p.RHS]:
                    edgeHash[p.RHS].append(e)
                    newEdge = e+(funChildren(),)
                    edgeList.append(newEdge)
                    edgeWasInserted[0] = True
            else:
                oldEdgeList = [eo for eo in edgeHash[p.LHS] if eo[0]==src]
                if 0 == len(oldEdgeList):
                    edgeHash[p.LHS].append(e)
                    edgeList.append(e)
                    parseTree[(src, dst, p.LHS)] = (funChildren(), p)
                    edgeWasInserted[0] = True
                else:
                    addAmbiguousEdge(src, dst, p, e, oldEdgeList, edgeHash, edgeList, funChildren)
        
        def addAmbiguousEdge(src, dst, p, e, oldEdgeList, edgeHash, edgeList, funChildren):
            
            oldEdge = oldEdgeList[0]
            replaceEdge = False
            (newOpPrec, newAssoc, newDprec, newProduction) = p.info
            (oldOpPrec, oldAssoc, oldDprec, oldProduction) = oldEdge[PROD].info
            
            children = None
            oldChildren = parseTree[(src, dst, p.LHS)][0]
            
            if (newOpPrec is not None) and (oldOpPrec is not None):
                if newOpPrec < oldOpPrec:
                    replaceEdge = True
                elif newOpPrec == oldOpPrec:
                    children = funChildren()
                    lop1 = children[0]
                    lop2 = oldChildren[0]
                    leftLarger = (lop1[DST]-lop1[SRC]) > (lop2[DST] - lop2[SRC])
                    if newAssoc == grammar.Grammar.LEFT_ASSOCIATIVE:
                        replaceEdge = leftLarger
                    else:
                        replaceEdge = not leftLarger
            elif (newDprec is not None) and (oldDprec is not None) and (newDprec != oldDprec):
                replaceEdge = newDprec > oldDprec
            else:
                reinsert = False
                if p is oldEdge[PROD]:
                    if not children:
                        children = funChildren()
                        
                    if hash(children) == hash(oldChildren):
                        reinsert = True
                if (debug and not reinsert):
                    output = StringIO.StringOP()
                    print >>output, "No disambiguation information for input "\
                        "segment: '%s' " %" ".join(zip(*tokens)[1][e[0]:e[1]])
                    print >>output, "Conflicting productions and their OpPrec, "\
                        " Assoc, Dprec: "
                    print >>output, oldEdge[PROD].toString(\
                          self.invRenamedTerminals) + "\t: ", oldOpPrec,\
                          oldAssoc[0] if oldAssoc else None, oldDprec
                    print >>output, e[PROD].toString(self.invRenamedTerminals)\
                          + "\t: ", newOpPrec, newAssoc[0] if newAssoc else\
                          None, newDprec
                    print output.getvalue()
                    output.close()
            if replaceEdge:
                edgeHash[p.LHS].remove(oldEdge)
                edgeList.remove(oldEdge)
                edgeHash[p.LHS].append(e)
                edgeList.append(e)
                if not children:
                    children = funChildren()
                parseTree[(src,dst,p.LHS)] = (children, p)
        
        for p in self.grammar[self.grammar.startSymbol].productions:
            addEdge((0,0,p,0), lambda:tuple())
        
        for j in xrange(0, len(tokens) + 1):
            if j > 0:
                for e in edgesIncomingTo(j-1, INPROGRESS):
                    (i, _j, p, pos, children) = e
                    if pos < len(p.RHS) and p.RHS[pos] == tokens[j-1][TOKEN]:
                        addEdge((i,j,p,pos+1), \
                                lambda:children+(tokens[j-1][LEXEME],))
            edgeWasInserted[0] = True
            while edgeWasInserted[0]:
                edgeWasInserted[0] = False
                for eij in edgesIncomingTo(j,COMPLETE):
                    (i,_j,p,pos) = eij
                    for eki in edgesIncomingTo(i, INPROGRESS):
                        (k,_i,p2,pos2,childrenki) = eki
                        if p2.RHS[pos2] == p.LHS:
                            addEdge((k,j,p2,pos2+1), \
                                    lambda:childrenki+((i,j,p.LHS),))
                
                for (i, _j, p, pos, children) in edgesIncomingTo(j, INPROGRESS):
                    if not EarleyParser.__isTermSymbol(p.RHS[pos]):
                        M = p.RHS[pos]
                        for p2 in self.grammar[M].productions:
                            addEdge((j,j,p2,0), lambda:tuple())
            
        root = None
        for e in edgesIncomingTo(len(tokens), COMPLETE):
            (frm, to, p, pos) = e
            assert to==len(tokens)
            if frm == 0 and p.LHS == self.grammar.startSymbol and pos == len(p.RHS):
                root = e
                
        if (False):
            edges = []
            for i in xrange(0,len(tokens)+1):
                edges.extend(edgesIncomingTo(i, COMPLETE))
            edges = [(src, dst, prod.toString(self.invRenamedTerminals), pos) for \
                     (src, dst, prod, pos) in edges]
            edges.sort()
            pprint.pprint(edges)
        if not root:
            util.error('syntax error in the input')
            err = 0
            for i in xrange(0, len(tokens) + 1):
                if len(edgesIncomingTo(i, COMPLETE)) > 0:
                    err = i
            t,l = zip(*tokens)
            util.error("Likely error position (characters from start of" +\
                       " file): %s" % err)
            util.error("Input starting at this character: " + "".join(l[err:]))
            return "Error"
        
        visited = {}
        def constructTheParse (tree):
            visited[tree] = True
            if isinstance (tree, basestring):
                return ParseTreeNode(symbol=None, value=tree)
            (children, p) = parseTree[tree]
            if len(children) == 0:
                return ParseTreeNode(symbol=p.LHS, actions=p.actions, \
                                     children=[ParseTreeNode(symbol=None,\
                                                             value=None)])
            else:
                return ParseTreeNode(symbol=p.LHS, actions=p.actions,\
                                     children=[constructTheParse(c) \
                                               for c in children])
        
        (src,dst,p,pos) = root
        theParse = constructTheParse((src, dst, p.LHS))
        if self.emit:
            return theParse.emit(self.grammar.imports)
        else:
            return theParse.evaluate ()

        
    def tokenize (self, inp):
        '''Return the tokenized version of INP, a sequence of
        (token, lexeme) pairs.
        '''
        tokens = []
        pos = 0

        while True:
            matchLHS = 0
            matchText = None
            matchEnd = -1

            for regex, lhs in self.terminals:
                match = regex.match (inp, pos)
                if match and match.end () > matchEnd:
                    matchLHS = lhs
                    matchText = match.group ()
                    matchEnd = match.end ()

            if pos == len (inp):
                if matchLHS:  tokens.append ((matchLHS, matchText))
                break
            elif pos == matchEnd:       # 0-length match
                raise Exception, pos
            elif matchLHS is None:      # 'Ignore' tokens
                pass
            elif matchLHS:              # Valid token
                tokens.append ((matchLHS, matchText))
            else:                       # no match
                raise Exception, pos

            pos = matchEnd

        return tokens


    def dump (self, f=sys.stdout):
        '''Print a representation of the grammar to f.'''

        self.grammar.dump()

        for regex, lhs in self.terminals:
            if lhs is None:  lhs = '(ignore)'
            print lhs, '->', regex.pattern


    ##---  STATIC  ------------------------------------------------------------

    TERM_PFX = '*'     # prefix of nonterminals replacing terminals
    NONTERM_PFX = '@'  # prefix of nonterminals replacing RHSs with > 2 symbols

    @staticmethod
    def preprocess (self, gram, emit):
        '''Returns the tuple:
        
        (
          [ (regex, lhs) ],             # pattern/token list
        )

        WARNING: modifies GRAM argument.
        '''

        REGEX = re.compile ('')
        
        terminals = []
        renamedTerminals = {}
        epsilons = []

        # Import all the grammar's modules into a new global object
        if not emit:
            try:
                glob = util.doImports (gram.imports)
            except Exception, e:
                util.error ('problem importing %s: %s' % (gram.imports, str(e)))
                sys.exit(1)
        
        # Add 'ignore' patterns to the terminals list
        for regex in gram.ignores:
            terminals.append ((regex, None))

        # Add 'optional' patterns to the terminals list
        for sym, regex in gram.optionals:
            terminals.append ((regex, sym))

        # Build a lookup table for operator associavitiy/precedences
        operators = {}
        for op, prec, assoc in gram.getAssocDecls ():
            operators [op.pattern] = (prec, assoc)

        # First pass -- pull out epsilon productions, add terminal rules
        # and take care of semantic actions
        ruleNum = 0                     # newly-created rules
        for rule in gram.rules:
            lhs = rule.lhs
            for production in rule.productions:
                actions = production.actions
                rhs = list(production.RHS)

                # Create the S-action, if specified
                if actions[len (rhs)]:
                    if (not self.emit):
                        actions[len (rhs)] = EarleyParser.makeSemantFunc (
                            actions[len (rhs)], len (rhs), glob)
                    else:
                        actions[len (rhs)] = EarleyParser.emitSemantFunc (
                            actions[len (rhs)], len (rhs))

                # Pull out epsilons and terminals
                for i, sym in enumerate (rhs):
                    if sym == grammar.Grammar.EPSILON:
                        # Epsilon
                        # 
                        # CYK: info = (None, None, None, production)
                        # CYK: epsilons.append ((lhs, info))
                        assert len (rhs) == 1
                        rhs = [] # in Earley, we model empsilon as an empty rhs
                        production.RHS = []

                    elif type (sym) == type (REGEX):
                        # Terminal symbol
                        if sym.pattern in renamedTerminals:
                            # Terminal was already factored out
                            termSym = renamedTerminals[sym.pattern]
                        else:
                            # Add *N -> sym rule, replace old symbol
                            termSym = '%s%d'% (EarleyParser.TERM_PFX, ruleNum)
                            ruleNum += 1
                            renamedTerminals[sym.pattern] = termSym
                            terminals.append ((sym, termSym))

                        if sym.pattern in operators:
                            # This pattern has a global assoc/prec declaration
                            # (which might be overridden later)
                            prec, assoc = operators[sym.pattern]
                            production.opPrec = prec
                            production.opAssoc = assoc
                        rhs[i] = termSym

                    if actions[i]:
                        # I-action for this symbol
                        if (not self.emit):
                            actions[i] = EarleyParser.makeSemantFunc (
                                actions[i], len (rhs), glob)
                        else:
                            actions[i] = EarleyParser.emitSemantFunc (
                                actions[i], len(rhs))
                        
                production.RHS = tuple(rhs)

        # Second pass -- build the symbol mapping and collect parsing info
        ruleNum = 0
        for rule in gram.rules:
            for production in rule.productions:
                lhs = rule.lhs
                rhs = production.RHS

                if len (rhs) == 1 and rhs[0] == grammar.Grammar.EPSILON:
                    # Epsilon production, skip it
                    continue

                # Collect precedence/associativity info
                if production.assoc != None:
                    # This production had a %prec declaration
                    opPrec, assoc = operators[production.assoc.pattern]
                elif production.opPrec != None:
                    # This production had a terminal symbol with an assoc/prec
                    # declaration
                    opPrec = production.opPrec
                    assoc = production.opAssoc
                else:
                    # No declarations ==> undefined prec, assoc
                    opPrec, assoc = None, None

                # Collect dprec info
                if production.prec != -1:
                    # Production had a %dprec declaration
                    dprec = production.prec
                else:
                    # No declaration ==> undefined dprec
                    dprec = None

                # Information about this production to be used during parsing
                production.info = (opPrec, assoc, dprec, production)
        
        return terminals, dict([(new,orig) for (orig,new) in renamedTerminals.iteritems()])


    @staticmethod
    def makeSemantFunc (code, numArgs, globalObject):
        args = ['n0']
        for i in xrange (numArgs):
            args.append ('n%d'% (i+1))
        try:
            return util.createFunction (util.uniqueIdentifier (),
                                        args, code, globalObject)
        except Exception, e:
            util.error ("""couldn't create semantic function: """ + str(e))
            sys.exit(1)

    @staticmethod
    def emitSemantFunc (code, numArgs):
        args = ['n0']
        for i in xrange (numArgs):
            args.append('n%d'% (i+1))
        name = utio.uniqueIdentifier()
        return (name, util.createFunctionText(name, args, code))
    
    @staticmethod
    def __isTermSymbol (sym):
        '''Return TRUE iff SYM is a 'virtual' nonterminal for a
        terminal symbol, created during grammar normalization.
        '''
        return sym[0] == EarleyParser.TERM_PFX


    @staticmethod
    def dumpEdges (edges):
        '''Print a representation of the edge set EDGES to stdout.'''
        for sym, frm, to in edges:
            print '(%d)--%s--(%d)'% (frm, sym, to)


    @staticmethod
    def dumpTree (tree, edges, level=0):
        '''Print a representation of the parse tree TREE to stdout.'''
        sym, frm, to = tree[0:3]
        if len (tree) > 3:
            children = tree[3]
        else:
            children = edges[(sym, frm, to)][3]
        if (isinstance (children, types.StringType) or
            children is grammar.Grammar.EPSILON):
            print '%s%s "%s")'% ('-'*level*2, sym, children)
        else:
            print '%s%s %d-%d'% ('-'*level*2, sym, frm, to)
            for child in children:
                EarleyParser.dumpTree (child, edges, level + 1)

# For instrumentation 
def incr(id):
    pass 

if __name__ == '__main__':
    pass 