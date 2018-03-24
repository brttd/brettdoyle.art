const var1 = 1
let var2 = 'a2'

console.log(var1)

exec('console.log(var2)')
exec((var2 = ':::'))

console.log(var2)
