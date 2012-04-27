# PA2: Bytecode interpreter for lambdas and coroutines
#
# Motivation: stackful interpreter cannot implement coroutines

import sys, getopt

##################################################################################
#                              BYTECODE COMPILER                                 #
##################################################################################
# The bytecode array stores intructions of the main scrope; bytecode arrays
# for the lambda bodies are nested bytecode arrays, stored in the call instuction

# Bytecode instruction
#   opcode: instruction type
#   ret:    return register
#   reg1:   register of first operand
#   reg2:   register of second operand
#   reg3:   register of third operand
#   args:   list of arguments
#   body:   code
class BcInst(object):
    def __init__(self, opcode, ret):
        self.opcode = opcode
        self.ret = ret
    def __str__(self):
        return '%s\t%s' % (self.opcode, self.ret)

# Used for basic arithmetic instructions
class BcInstBase(BcInst):
    def __init__(self, opcode, ret, reg1 = None, reg2 = None, reg3 = None):
        super(BcInstBase, self).__init__(opcode, ret)
        self.reg1 = reg1
        self.reg2 = reg2
        self.reg3 = reg3
    def __str__(self):
        [r1, r2, r3] = map(lambda r: r is None and ' ' or ', ' + str(r), \
                           [self.reg1, self.reg2, self.reg3])
        return '%s\t%s%s%s%s' % (self.opcode, self.ret, r1, r2, r3)

# Used for more implicated instructions
class BcInstSpec(BcInst):
    def __init__(self, opcode, ret, args = None, body = None, reg1 = None):
        super(BcInstSpec, self).__init__(opcode, ret)
        self.reg1 = reg1
        self.body = body
        self.args = args
    def __str__(self):
        ex = self.reg1 is None and self.args or self.reg1
        return '%s\t%s, %s' % (self.opcode, self.ret, ex)

cnt = 0
def bytecode(e):
    # get unique name
    def newTemp():
        global cnt
        cnt = cnt + 1
        return '$'+str(cnt)
    
    # get byte code which executes the expression e
    def bc(e, t):
        t1, t2, t3 = newTemp(), newTemp(), newTemp()
        # is e a list of statements (body of function or outer level code)
        if type(e) == type([]):
            # FIXME: Add explicit 'return' instruction after each block of
            # instructions and fix bugs/corner cases
            if len(e) == 0:
                return [BcInst('null', t), BcInst('return', t)]
            else:
                insts = reduce(lambda stmts, s: stmts + bc(s, newTemp()), e[:-1], [])
                insts += bc(e[-1], t)
                insts += [BcInst('return', t)]
                return insts
        # e is an expression or a statement
        if type(e) == type(()):
            # Expressions
            # note: reorder expressions
            if e[0] == 'null':
                return [BcInst('null', t)]
            if e[0] == 'type':
                return bc(e[1], t1) + [BcInstBase('type', t, t1)]
            if e[0] in ['int-lit', 'fp-lit', 'var']:
                return [BcInstBase('def', t, e[1])]
            if e[0] == 'string-lit':
                return [BcInstBase('string', t, e[1])]
            if e[0] == 'dict-lit':
                return [BcInst('dict', t)]
            if e[0] in ['+', '-', '*', '/', '==', '!=', '<=', '>=', '<', '>', 'in', 'get']:
                return bc(e[1], t1) + bc(e[2], t2) + \
                       [BcInstBase(e[0], t, t1, t2)]
            if e[0] == 'len':
                return bc(e[1], t1) + [BcInstBase('len', t, t1)]
            if e[0] == 'lambda':
                return [BcInstSpec('lambda', t, e[1], bc(e[2], t1))]
            if e[0] == 'call':
                args = e[2]
                func = e[1]
                arg_temps = [newTemp() for i in range(len(args))]
                ts = list(arg_temps)
                insts = bc(func, t1)
                insts += reduce(lambda code, s: code + \
                                bc(s, ts.pop(0)), args, [])
                insts += [BcInstSpec('call', t, arg_temps, None, t1)]
                return insts
            if e[0] == 'ite':
                return bc(e[1], t1) + bc(e[2], t2) + bc(e[3], t3) + \
                       [BcInstBase('ite', t, t1, t2, t3)]
            if e[0] == 'coroutine':
                return bc(e[1], t1) + [BcInstBase('coroutine', t, t1)]
            if e[0] == 'resume':
                return bc(e[1], t1) + bc(e[2], t2) + \
                       [BcInstBase('resume', t, t1, t2)]
            if e[0] == 'yield':
                return bc(e[1], t1) + [BcInstBase('yield', t, t1)]
            if e[0] == 'input':
                return [BcInst('input', t)]
            if e[0] == 'exp':
                return bc(e[1], t)
            if e[0] == 'def':
                return bc(e[2], t) + [BcInstBase('def', e[1], t)]
            if e[0] == 'asgn':
                return bc(e[2], t) + [BcInstBase('asgn', e[1], t)]
            if e[0] == 'put':
                return bc(e[1], t1) + bc(e[2], t2) + bc(e[3], t3) + \
                       [BcInstBase('put', t, t1, t2, t3)]
            if e[0] == 'print':
                return bc(e[1], t) + [BcInstBase('print', t)]
            if e[0] == 'error':
                return bc(e[1], t) + [BcInstBase('error', t)]
            if e[0] == 'ncall':
                #print e
                arg1 = e[1]
                arg2 = e[2]
                func = (arg1, arg2)
                args = e[3]
                arg_temps = [newTemp() for i in range(len(args))]
                ts = list(arg_temps)
                insts = []
                insts += reduce(lambda code, s: code + \
                                bc(s, ts.pop(0)), args, [])
                insts += [BcInstSpec('ncall', t, arg_temps, func, t1)]
                return insts
            
        raise SyntaxError("Illegal AST node %s " % str(e))
    t = newTemp()
    return t, bc(e, t)

# Provided for your convenience :)
def print_bytecode(p, indent=0):
    for inst in p:
        if inst.opcode != 'lambda': print " "*8*indent, inst
        else:
            print " "*8*indent, str(inst)
            print_bytecode(inst.body,indent+1)

# Do tail call optimization
def tcall_opt(prog):
    def aliases(name, insts = prog):
        res = name
        for i in insts:
            if i.opcode == 'def' and i.ret in name:
                res.append(i.reg1)
            if i.opcode == 'def' and i.reg1 in name:
                res.append(i.ret)
            if i.opcode == 'lambda':
                res += aliases(res, i.body)
        return set(res)

    def walk(insts, fnames):
        for i in insts:
            if (i.opcode == 'call'):
                callee = aliases([i.reg1])
                ni = insts[insts.index(i) + 1]
                #print "callee: " + str(callee)
                #print "fnames: " + str(fnames)
                if callee & fnames and ni.opcode == 'return':
                    i.opcode = 'tcall'
            if i.opcode == 'lambda':
                if i.args:
                    walk(i.body, aliases([i.ret]))
                else:
                    walk(i.body, fnames)
    walk(prog, set())

def print_bytecode(p, indent=0):
    for inst in p:
        if inst.opcode != 'lambda': print " "*8*indent, inst
        else:
            print " "*8*indent, str(inst)
            print_bytecode(inst.body,indent+1)

def desugar(stmts):
    def desugarExp(e):
        if e[0] in ['+', '-', '*', '/', '==', '!=', '<=', '>=', '<', '>', 'in', 'get']:
            return (e[0], desugarExp(e[1]), desugarExp(e[2]))
        elif (e[0] == 'call'):
            e1 = desugarExp(e[1])
            dArgs = []
            for arg in e[2]:
                dArgs.append(desugarExp(arg))
            return (e[0], e1, dArgs)
        elif (e[0] == 'ncall'):
            return (e[0],e[1],e[2],[desugarExp(e[3])])
        elif (e[0] == 'mcall'):

            '''
            return desugarExp(('call', ('lambda', [], [('def', '#self', e[1]), ('exp', ('call', ('get', ('var', '#self'), ('string-lit', e[2])), [('var', '#self')]+e[3]))]), []))
            '''
            
            
            args = []
            args.append(('var', "#var"))
            for arg in e[3]:
              args.append(desugarExp(arg))
            inner = []
            inner.append(('def', '#var', e[1]))
            inner.append(('exp', ('call', ('get', ('var', '#var'), ('string-lit', e[2]) ), [('var', '#var')] + e[3])))
            return desugarExp( ('call', ('lambda', [], inner), []) )
            
            '''
            args = []
            args.append(desugarExp(e[1]))
            for arg in e[3]:
                args.append(desugarExp(arg))
            return ('call', ('get', desugarExp(e[1]), ('string-lit', e[2])), args) 
            '''

        elif (e[0] == 'lambda'):
            return (e[0], e[1], desugarStmts(e[2]))
        elif (e[0] == 'ite'):
            e1 = desugarExp(e[1])
            e2 = desugarExp(e[2])
            e3 = desugarExp(e[3])
            return (e[0], e1, e2, e3)
        elif (e[0] == 'dict-lit'):
            if len(e[1]) == 0:
                return (e[0],)
            inner = []
            inner.append(('def', '#dict', ('dict-lit',)))
            for init in e[1]:
                inner.append(('put', ('var', '#dict'), ('string-lit', init[0]), desugarExp(init[1])))
            inner.append(('exp', ('var', '#dict')))
            return ('exp', ('call', ('lambda', [], inner), []))
        elif e[0] == '||':
            trueBr = ('lambda', [], [('exp', ('int-lit', 1))])
            falseBr = ('lambda', [], [('exp', desugarExp(e[2]))])
            return ('call', ('ite', desugarExp(e[1]), trueBr, falseBr), [])
        elif e[0] == '&&':
            falseBr = ('lambda', [], [('exp', ('int-lit', 0))])
            trueBr = ('lambda', [], [('exp', desugarExp(e[2]))])
            return ('call', ('ite', desugarExp(e[1]), trueBr, falseBr), [])
        elif e[0] == 'comprehension':
            body = e[1]
            lst = e[3]
            inner = []
            inner.append(('def', '#out', ('dict-lit', [])))
            inner.append(('def', '#i', ('int-lit', 0)))
            forInner = []
            forInner.append(('put', ('var', '#out'), ('var', '#i'), body))
            forInner.append(('asgn', '#i', ('+', ('var', '#i'), ('int-lit', 1))))
            inner.append(('for', e[2], lst, forInner))
            inner.append(('exp', ('var', '#out')))
            inner = desugarStmts(inner)
            return ('call', ('lambda', [], inner), [])
        elif e[0] in ['len', 'coroutine', 'yield']:
            return (e[0], desugarExp(e[1]))
        elif e[0] == 'resume':
            return (e[0], desugarExp(e[1]), desugarExp(e[2]))
        else:
            return e
    def desugarStmts(stmts):
        dStmts = []
        for s in stmts:
            if s[0] == 'exp' or s[0] == 'print' or s[0] == 'error':
                s1 = desugarExp(s[1])
                dStmts.append((s[0], s1))
            elif s[0] == 'asgn' or s[0] == 'def':
                s2 = desugarExp(s[2])
                dStmts.append((s[0], s[1], s2))
            elif s[0] == 'put':
                dStmts.append((s[0], desugarExp(s[1]), desugarExp(s[2]), desugarExp(s[3])))
            elif s[0] == 'fdef':
                s3 = desugarStmts(s[3])
                body = ('lambda', s[2], s3)
                dStmts.append(('def', s[1], body))
            elif s[0] == 'if':
                s1 = desugarExp(s[1])
                s2 = desugarStmts(s[2])
                if s[3]:
                    s3 = desugarStmts(s[3])
                else:
                    s3 = []
                ifBranch = ('lambda', [], s2)
                elseBranch = ('lambda', [], s3)
                dStmts.append(('exp', ('call', ('ite', s1, ifBranch, elseBranch), [])))
            elif s[0] == 'while':
                inner = []
                inner.append(('def', '#while', ('lambda', [], [('if', s[1], s[2] + [('exp', ('call', ('var', '#while'), []))], [])])))
                inner.append(('exp', ('call', ('var', '#while'), [])))
                inner = desugarStmts(inner)
                dStmts.append(('exp', ('call', ('lambda', [], inner), [])))
            elif s[0] == 'for':
                inner = []
                inner.append(('def', '#iter', s[2]))
                checkType = ('==', ('type', ('var', '#iter')), ('string-lit', 'table'))
                getIterator = [('asgn', '#iter', ('call', ('var', '_getIterator_'), [('var', '#iter')]))]
                inner.append(('if', checkType, getIterator, None))
                inner.append(('def', '#for', ('lambda', [], [('def', s[1], ('call', ('var', '#iter'), [])), ('if', ('!=', ('var', s[1]), ('null',)),s[3] + [('exp', ('call', ('var', '#for'), []))], [])])))
                inner.append(('exp', ('call', ('var', '#for'), [])))
                inner = desugarStmts(inner)
                dStmts.append(('exp', ('call', ('lambda', [], inner), [])))
            else:
                dStmts.append(s)
        return dStmts
    return desugarStmts(stmts)
