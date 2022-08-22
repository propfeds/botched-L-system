// import { ExponentialCost, FirstFreeCost, LinearCost } from "../api/Costs";
// import { Localization } from "../api/Localization";
// import { BigNumber } from "../api/BigNumber";
// import { theory } from "../api/Theory";
// import { Utils } from "../api/Utils";

var id = "fucked_up_l_systems";
var name = "Fucked Up L-systems";
var description = "A basic theory based on L-systems.";
var authors = "propfeds#5988 (propsuki)";
var version = 0;

// Char     Meaning
// F        Move forward by line length drawing a line
// f        Move forward by line length without drawing a line
// +        Turn left by turning angle
// -        Turn right by turning angle
// |        Reverse direction (ie: turn by 180 degrees)
// [        Push current drawing state onto stack
// ]        Pop current drawing state from the stack
// #        Increment the line width by line width increment
// !        Decrement the line width by line width increment
// @        Draw a dot with line width radius
// {        Open a polygon
// }        Close a polygon and fill it with fill colour
// >        Multiply the line length by the line length scale factor
// <        Divide the line length by the line length scale factor
// &        Swap the meaning of + and -
// (        Decrement turning angle by turning angle increment
// )        Increment turning angle by turning angle increment

// Axiom X
// F --> FF
// X --> F-[[X]+X]+F[+FX]-X
// ø = 22.5
// Symbols: FX+-[]

var bigNumberArray = (array) => array.map((row) => row.map(x => x))

var idMat = (size) =>
{
    var result = [];
    for(var i = 0; i < size; i++)
    {
        result[i] = [];
        for(var j = 0; j < size; j++)
        {
            if(i==j)
                result[i][j] = 1;
            else
                result[i][j] = 0;
        }
    }
    return result;
}

var matMul = (m1, m2) =>
{
    var result = [];
    for(var i = 0; i < m1.length; i++)
    {
        result[i] = [];
        for(var j = 0; j < m2[0].length; j++)
        {
            var sum = 0;
            for(var k = 0; k < m1[0].length; k++)
            {
                sum += m1[i][k] * m2[k][j];
            }
            result[i][j] = sum;
        }
    }
    return result;
}

var matPow = (A, n) =>
{
    if(n < 1)
        return idMat(A.length);
    if(n == 1)
        return A;
    
    let exp = n;
    let p = 0;
    let result = idMat(A.length);
    while(exp)
    {
        if(rulePowers[p] === undefined)
            rulePowers[p] = matMul(rulePowers[p-1], rulePowers[p-1]);
        if(exp%2)
            result = matMul(result, rulePowers[p]);
        exp >>= 1;
        p++;
    }
    return result;
}

var printMat = (A) =>
{
    let row = "";
    for(var i = 0; i < A.length; i++)
    {
        for(var j = 0; j < A[i].length; j++)
            row += A[i][j].toString()+" ";
        console.log(row);
        row = "";
    }
}


var rho = bigNumberArray([[0, 1, 0, 0, 0, 0]]);
var rules = bigNumberArray([
    [2, 0, 0, 0, 0, 0],
    [3, 4, 3, 2, 3, 3],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 1]
]);
var rulePowers = [rules];
var rhoPowers = [];


for(var i = 1; i < 8; i++)
{
    console.log(i);
    rhoPowers[i-1] = matMul(rho, matPow(rules, i));
    printMat(rhoPowers[i-1]);
}
// 3, 18, 84, 360, 1488, 6048, 24384
// 3(2^n-1)*2^(n-1)
// 3, 9, 21, 45, 93, 189, 381
// 3(2^n-1)
// 1, 3, 7, 15, 31, 63, 127
// 2^n - 1