var Closure = function(body, args, env, recurse){
  this.body = body
  this.args = args
  this.env = env
  this.recurse = recurse
}
var serverUrl = "/start"
var updateUrl = "/order"

var gameState = {}

var Exec = function(stmts){
  var info = {}
  console.log("Here's jQuery")
  console.log(jQuery)
  jQuery.ajax({
         type: "POST",
         data: {},
         url:    serverUrl,
         success: function(result) {
                     info = result
                  },
         async:   false
    });
  var playerId = info['id']
  var ordersToPost = {'id': playerId, 'orders': []}      
     
  var evalExp = function(e, env){
    var lookup = function(name, env){
      if (!(env[name] == undefined)){
         return env[name]
      }
      else if (!(env['__up__'] == undefined))  {
         return lookup(name, env['__up__'])
      }
      else{
         console.log("couldn't find")
         console.log(name)
         console.log("Interpreter Error")
      }
    }
    if (e[0] === 'null'){
      return null
    }
    if (e[0] === 'exp'){
      console.log(e)
      return evalExp(e[1], env)
    }
    if (e[0] === 'move'){
      ordersToPost['orders'].push({ 'shipName': evalExp(e[1], env), 'action': 'move' , 'actArgs': {'distance': evalExp(e[2], env) }})
    }
    if (e[0] === 'turn'){
      ordersToPost['orders'].push({ 'shipName': evalExp(e[1], env), 'action': 'turn' , 'actArgs': {'direction': evalExp(e[2], env) }})
    }
    if (e[0] === 'shoot'){
      ordersToPost['orders'].push({ 'shipName': evalExp(e[1], env), 'action': 'shoot' , 'actArgs': { }})
    }
    if (e === 'executeOrders' || e[0] === 'executeOrders'){
      var orderString = JSON.stringify(ordersToPost['orders'])
      jQuery.ajax({
         type: "POST",
         url: updateUrl,
         data: {id : ordersToPost['id'], orders: orderString},
         success: function(result) {
                     gameState = result
                  },
        async: false
      });
      ordersToPost['orders'] = []
      return true
    }
    if (e[0] === 'int-lit'){
      return e[1]
    }
    if (e[0] === 'string-lit'){
      return e[1]
    }
    if (e[0] === 'dict-lit'){
      return {}
    }
    if (e[0] === 'var'){
      return lookup(e[1], env)
    }
    if (e[0] === 'put'){
      var dict = evalExp(e[1], env)
      var index = evalExp(e[2], env)
      var value = evalExp(e[3], env)
      dict[index] = value 
    }
    if (e[0] === 'get'){
      var dict = evalExp(e[1], env)
      var index = evalExp(e[2], env)
      return dict[index]
    }
    if (e[0] === '+'){
       return evalExp(e[1], env) + evalExp(e[2], env)
    }
    if (e[0] === '-'){
       return evalExp(e[1], env) + evalExp(e[2], env)
    }
    if (e[0] === '*'){
       return evalExp(e[1], env) * evalExp(e[2], env)
    }
    if (e[0] === '/'){
       return evalExp(e[1], env) / evalExp(e[2], env)
    }
    if (e[0] === '=='){
       if (evalExp(e[1], env) === evalExp(e[2], env)){
         return true
       }
       else{
         return false
       }
    }
    if (e[0] === '<='){
      if (evalExp(e[1], env) <= evalExp(e[2], env)){
         return true
       }
       else{
         return false
       }
    }
    if (e[0] === '>='){
      if (evalExp(e[1], env) >= evalExp(e[2], env)){
         return true
       }
       else{
         return false
       }
    }
    if (e[0] === '!='){
      if (evalExp(e[1], env) !== evalExp(e[2], env)){
         return true
       }
       else{
         return false
       }
    }
    if (e[0] === '<'){
      if (evalExp(e[1], env) < evalExp(e[2], env)){
         return true
       }
       else{
         return false
       }
    }
    if (e[0] === '>'){
      if (evalExp(e[1], env) > evalExp(e[2], env)){
         return true
       }
       else{
         return false
       }
    }
    if (e[0] === 'call'){
      var varlist = []
      for (i in e[2]){
        var exp = e[2][i]
        varlist.push(evalExp(exp, env))
      }
      return doCall(evalExp(e[1], env), env, varlist)
      
    }
    if (e[0] === 'update'){
      var c = new Closure(e[2], e[1], env)
      var retClosure = new Closure(e[2], e[1], env, true)
      return retClosure
    }
    if (e[0] === 'lambda'){
      var c = new Closure(e[2], e[1], env)
      return c
    }
    if (e[0] === 'ite'){
       if ( !evalExp(e[1], env) ){
         return evalExp(e[3], env)
       }
       else{
         return evalExp(e[2], env)
       } 
    }
  }

  var evalStmt = function(stmts, env){
    var update = function(name, env, val){
      if (!(env[name] == undefined)){
        env[name] = val
      }
      else if (env["__up__"] != undefined){
        update(name, env["__up__"] , val)
      }
    }
    
    var val = null
    for (i in stmts){
      
      var s = stmts[i]
      if (s[0] === 'exp'){
          val = evalExp(s[1], env)
      }
      else if (s[0] === 'def'){
          val = evalExp(s[2], env)
          env[s[1]] = val
          //console.log('DONE PUTTING IN ENVIRONMENT')
      }
      else if (s[0] === 'print'){
        console.log('PRINTING !!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
        //console.log(s[1])
        console.log(evalExp(s[1], env))
       
      }
      else if (s[0] === 'call'){
        val = doCall(evalExp(s[1], env), env, s[2])
      }
      else if (s[0] === 'asgn'){
        update(s[1], env, evalExp(s[2], env))
      }
      else if (s[0] === 'put'){
        var dict = evalExp(s[1], env)
        var index = evalExp(s[2], env)
        var value = evalExp(s[3], env)
        dict[index] = value
        console.log(dict[index])
      }

    }
    return val
  }

  var doCall = function(closure, env, varList){
    var closureFrame = closure.env
    var frame = {'__up__' : closureFrame}
    var i = 0
    for (i in closure.args){
      arg = closure.args[i]
      frame[arg] = varList[i]
      i = i+1
    }
    if (closure.recurse === true){
       setTimeout( function () {doCall(closure, env, varList)} , 750)
    }
    return evalStmt(closure.body, frame)
  }
  return evalStmt(stmts, { "__up__": null})
}

