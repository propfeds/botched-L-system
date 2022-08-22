var matPowRec = (A, n) =>
{
    if(n < 1)
        return idMat(A.length);
    if(n == 1)
        return A;
    if(n%2)
    {
        let B = matPow(A, (n-1)/2);
        return matMul(matMul(B, B), A);
    }
    else
    {
        let B = matPow(A, n/2);
        return matMul(B, B);
    }
}

var matPowOld = (A, n) =>
{
    if(n < 1)
        return idMat(A.length);
    if(n == 1)
        return A;
    
    let exp = n;
    let p = A;
    let result = idMat(A.length);
    while(exp)
    {
        if(exp%2)
            result = matMul(result, p);
        exp >>= 1;
        p = matMul(p, p);
    }
    return result;
}