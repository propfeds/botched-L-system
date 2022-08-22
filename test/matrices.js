function matmul(m1, m2)
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

// let matmul = (A, B) =>
//   A.map((row, i) =>
//     B[0].map((_, j) =>
//       row.reduce((acc, _, n) =>
//         acc + A[i][n] * B[n][j], 0
//       )
//     )
//   )

var axiom = [[4, 3, 0]]

var rules = [
    [8, 3, 3],
    [0, 1, 0],
    [0, 0, 1]
]

var mResult = matmul(axiom, rules)

/*In Google Chrome and Firefox you can do:*/

console.table(mResult) /* it shows the matrix in a table */