import { ExponentialCost, FirstFreeCost, LinearCost } from "../api/Costs";
import { Localization } from "../api/Localization";
import { BigNumber, parseBigNumber } from "../api/BigNumber";
import { QuaternaryEntry, theory } from "../api/Theory";
import { Utils } from "../api/Utils";

var id = "botched_L_system";
var name = "Botched L-system";
var description = "Your school's laboratory has decided to grow a fictional plant in the data room.\n\nBe careful of its exponential growth, do not leave it idle,\nelse the database would slow down to a crawl and eventually explode in a fatal ERROR.\n\nFurther explanation of L-systems:\nAxiom: the starting sequence\nRules: how the sequence expands each tick\nF: moves cursor forward to create a line\nX: acts like a seed for branches\n-, +: turns cursor left/right\n[, ]: allows for branches, by queueing\ncursor positions on a stack\n\nNote: This theory will not draw a tree based on these rules due to its sheer size.";
var authors = "propfeds#5988 (propsuki)";
var version = 0.7;

var bigNumMat = (array) => array.map((row) => row.map(x => BigNumber.from(x)));

var bigNumList = (array) => array.map(x => BigNumber.from(x));

var idMat = (size) =>
{
    let result = [];
    for(let i = 0; i < size; i++)
    {
        result[i] = [];
        for(let j = 0; j < size; j++)
        {
            if(i == j)
                result[i][j] = BigNumber.ONE;
            else
                result[i][j] = BigNumber.ZERO;
        }
    }
    return result;
}

var matMul = (A, B) =>
    A.map((row, i) =>
        B[0].map((_, j) =>
            row.reduce((acc, _, n) =>
                acc + A[i][n] * B[n][j], BigNumber.ZERO
            )
        )
    )

var matPow = (A, n, cache) =>
{
    // log(n);
    if(n < 1)
        return idMat(A.length);
    if(n == 1)
        return A;
    
    let exp = n;
    let p = 0;
    let result = idMat(A.length);
    while(exp)
    {
        if(cache[p] === undefined)
            cache[p] = matMul(cache[p-1], cache[p-1]);
        if(exp & 1)
        {
            result = matMul(result, cache[p]);
        }
        exp >>= 1;
        p++;
    }
    return result;
}

var printMat = (A) =>
{
    let row = "";
    for(let i = 0; i < A.length; i++)
    {
        for(let j = 0; j < A[i].length; j++)
            row += A[i][j].toString()+" ";
        log(row);
        row = "";
    }
}

var bitCount = (n) =>
{
    let exp = n;
    let c = 0;
    while(exp)
    {
        if(exp & 1)
            c++;
        exp >>= 1;
    }
    return c;
}

var stringTickspeed = "\\text{{" + Localization.get("TheoryPanelTickspeed", "}}q_1q_2\\text{{", "}}{0}\\text{{") + "}}";

// Axiom X
// F --> FF
// X --> F-[[X]+X]+F[+FX]-X

// Axiom X
// F --> FXF
// X --> F-[[X]+X]+F[+FX]-X

// Axiom X
// E --> XEXF
// F --> FF[X]+E
// X --> F-[[X]+X]+F[+FX]-X

// Symbols: EFX+-[] ([] are not calculated!)

var rho = bigNumMat([[0, 0, 1, 0, 0]]);
var rules = [bigNumMat([
    [0, 0, 0, 0, 0],
    [0, 2, 0, 0, 0],
    [0, 3, 4, 3, 2],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1],
]), bigNumMat([
    [0, 0, 0, 0, 0],
    [0, 2, 1, 0, 0],
    [0, 3, 4, 3, 2],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1],
]), bigNumMat([
    [1, 1, 2, 0, 0],
    [1, 2, 1, 0, 0],
    [0, 3, 4, 3, 2],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1]
])];
// Stores rule^1, ^2, ^4, ^8, etc.
var rulePowers = [
    [rules[0]],
    [rules[1]],
    [rules[2]]
];
var weight = [bigNumMat([
    [0],
    [0.5],
    [1],
    [0],
    [0]
]), bigNumMat([
    [0],
    [0.5],
    [1],
    [2],
    [2]
]), bigNumMat([
    [1],
    [1],
    [1.5],
    [2],
    [2]
])];
var limitedTickspeed = bigNumList([1200, 160, 160]);
var ltsBitCount = [4, 1, 1];
var time = 0;
var bits = 0;
var currency;
var q1, q2, c1, c2;
var tickLimiter, evolution, c1Exp;
var quaternaryEntries = [];
var bitCountMap = new Map();


var init = () =>
{
    currency = theory.createCurrency();

    // q1 (Tickspeed)
    // Starts with 0, then goes to 1 and beyond?
    {
        let getDesc = (level) => "q_1=" + (level > 0 ? "1.28^{" + (level - 1) + "}" : "\\text{off}");
        let getDescNum = (level) => "q_1=" + getQ1(level).toString();
        q1 = theory.createUpgrade(0, currency, new FirstFreeCost(new ExponentialCost(7, 3)));
        q1.getDescription = (_) => Utils.getMath(getDesc(q1.level));
        q1.getInfo = (amount) => Utils.getMathTo(getDescNum(q1.level), getDescNum(q1.level + amount));
        q1.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
        q1.canBeRefunded = (_) => true;
    }
    // q2 (Tickspeed)
    // Literally the same as q1, just more expensive
    {
        let getDesc = (level) => "q_2=4^{" + level + "}";
        let getInfo = (level) => "q_2=" + getQ2(level).toString(0);
        q2 = theory.createUpgrade(1, currency, new ExponentialCost(1e8, Math.log2(1e8)));
        q2.getDescription = (_) => Utils.getMath(getDesc(q2.level));
        q2.getInfo = (amount) => Utils.getMathTo(getInfo(q2.level), getInfo(q2.level + amount));
        q2.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
        q2.canBeRefunded = (_) => true;
    }
    // c1
    {
        let getDesc = (level) => "c_1=" + getC1(level).toString(0);
        c1 = theory.createUpgrade(2, currency, new ExponentialCost(1e5, Math.log2(1.6)));
        c1.getDescription = (_) => Utils.getMath(getDesc(c1.level));
        c1.getInfo = (amount) => Utils.getMathTo(getDesc(c1.level), getDesc(c1.level + amount));
        c1.canBeRefunded = (_) => false;
    }
    // c2
    {
        let getDesc = (level) => "c_2=2^{" + level + "}";
        let getInfo = (level) => "c_2=" + getC2(level).toString(0);
        c2 = theory.createUpgrade(3, currency, new ExponentialCost(3e9, 4));
        c2.getDescription = (_) => Utils.getMath(getDesc(c2.level));
        c2.getInfo = (amount) => Utils.getMathTo(getInfo(c2.level), getInfo(c2.level + amount));
        c2.canBeRefunded = (_) => false;
    }

    theory.createPublicationUpgrade(0, currency, 1e8);
    // theory.createBuyAllUpgrade(1, currency, 1e16);
    // theory.createAutoBuyerUpgrade(2, currency, 1e24);

    // First unlock is at the same stage as auto-buyer
    theory.setMilestoneCost(new LinearCost(16, 16));

    // Tick limiter: locks tickspeed to a certain value.
    // The first level will most likely give a growth boost,
    // but the second level acts more like lag prevention.
    // Lag is the main mechanic of this theory.
    {
        tickLimiter = theory.createMilestoneUpgrade(0, 2);
        tickLimiter.getDescription = (_) => Localization.format("Limits tickspeed to {0}", limitedTickspeed[tickLimiter.level].toString(0));
        tickLimiter.info = "Locks tickspeed regardless of variable levels";
        tickLimiter.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
    }

    // Branch weight: gives a flat multiplication bonus.
    {
        evolution = theory.createMilestoneUpgrade(1, 2);
        evolution.getDescription = (amount) => (evolution.level + amount < 2 ? Localization.getUpgradeIncCustomDesc("(+)/(-)", "2") + " in weight" : Localization.getUpgradeUnlockDesc("E"));
        evolution.getInfo = (amount) => (evolution.level + amount < 2 ? "Raises public awareness about the beauty of fractal curves" : "Raises internal awareness about the beauty of evolution");
        evolution.boughtOrRefunded = (_) =>
        {
            theory.invalidatePrimaryEquation();
            theory.invalidateSecondaryEquation();
            theory.invalidateQuaternaryValues();
        }
    }

    // c1 exponent upgrade.
    {
        c1Exp = theory.createMilestoneUpgrade(2, 6);
        c1Exp.description = Localization.getUpgradeIncCustomExpDesc("c_1", "0.02");
        c1Exp.info = Localization.getUpgradeIncCustomExpInfo("c_1", "0.02");
        c1Exp.boughtOrRefunded = (_) => theory.invalidateSecondaryEquation();
    }

    chapter1 = theory.createStoryChapter(0, "The L-system", "'I am very sure.\nWheat this fractal plant, we will be able to attract...\nfunding, for our further research!'\n\n'...Now turn it on, watch it rice, and the magic will happen.'", () => true);
    chapter2 = theory.createStoryChapter(1, "Limiter", "My colleague told me that, in case of emergency,\nI should turn this limiter on to slow down the computing.", () => tickLimiter.level > 0);
    chapter3 = theory.createStoryChapter(2, "Fractal Exhibition", "Our manager is arranging an exhibition next week,\nto showcase the lab's research on fractal curves.\n\nIs this lady out of her mind?\nOur generation algorithm is barley working...", () => evolution.level > 0);
    chapter4 = theory.createStoryChapter(3, "Nitpicking Exponents", "Our database uses a log2 matrix power algorithm,\nwhich means that the more 1-bits that are on the exponent,\nthe more we have to process.\n\nAnd the fewer there are, the less likely we would face\nthe catastrophe.", () => tickLimiter.level > 1);
}

// I copied this from Gilles' T1. Not copyrighted.
var tick = (elapsedTime, multiplier) =>
{
    let tickSpeed = getTickspeed(tickLimiter.level);

    if(tickSpeed.isZero)
        return;
    
    let timeLimit = 1 / tickSpeed.Min(BigNumber.TEN).toNumber();
    time += elapsedTime;

    if(time >= timeLimit - 1e-8)
    {
        let tickPower = Math.round(tickSpeed.toNumber() * time);
        if(tickLimiter.level > 0)
        {
            let origTickPower = Math.round(getTickspeed(0).toNumber() * time);
            if(!bitCountMap.has(origTickPower))
                bitCountMap.set(origTickPower, bitCount(origTickPower));
            bits = bitCountMap.get(origTickPower);
        }
        else
        {
            if(!bitCountMap.has(tickPower))
                bitCountMap.set(tickPower, bitCount(tickPower));
            bits = bitCountMap.get(tickPower);
        }
        // log(tickPower);

        let bonus = theory.publicationMultiplier * multiplier;
        let vc1 = getC1(c1.level).pow(getC1Exponent(c1Exp.level));
        let vc2 = getC2(c2.level);

        growth = matPow(rules[evolution.level], tickPower, rulePowers[evolution.level])
        rho = matMul(rho, growth);
        currency.value += (matMul(rho, weight[evolution.level])[0][0]).log2() * bonus * vc1 * vc2;

        if(tickSpeed > BigNumber.TEN)
            time = 0;
        else
            time -= timeLimit;

        theory.invalidateTertiaryEquation();
        theory.invalidateQuaternaryValues();
    }
}

var getInternalState = () => `${currency.value} ${rho[0][0]} ${rho[0][1]} ${rho[0][2]} ${rho[0][3]} ${rho[0][4]} ${time}`

var setInternalState = (state) =>
{
    let values = state.split(" ");
    if(values.length > 0) currency.value = parseBigNumber(values[0])
    if(values.length > 1) rho[0][0] = parseBigNumber(values[1]);
    if(values.length > 2) rho[0][1] = parseBigNumber(values[2]);
    if(values.length > 3) rho[0][2] = parseBigNumber(values[3]);
    if(values.length > 4) rho[0][3] = parseBigNumber(values[4]);
    if(values.length > 5) rho[0][4] = parseBigNumber(values[5]);
    if(values.length > 6) time = parseBigNumber(values[6]);
}

var alwaysShowRefundButtons = () =>
{
    return true;
}

// Axiom X
// F --> FF
// X --> F-[[X]+X]+F[+FX]-X

// Axiom X
// F --> FXF
// X --> F-[[X]+X]+F[+FX]-X

// Axiom X
// E --> XEXF
// F --> FF[X]+E
// X --> F-[[X]+X]+F[+FX]-X

var getPrimaryEquation = () =>
{
    let result = "\\begin{matrix}";
    result += "Axiom\:\\text{X}\\\\";
    switch(evolution.level)
    {
        case 0: result += "\\text{F}\\rightarrow{}\\text{FF}\\\\";
        break;
        case 1: result += "\\text{F}\\rightarrow{}\\text{FXF}\\\\";
        break;
        case 2: result += "\\text{E}\\rightarrow{}\\text{XEXF, }";
        result += "\\text{F}\\rightarrow{}\\text{FF[X]+E}\\\\";
        break
    }
    result += "\\text{X}\\rightarrow{}\\text{F-[[X]+X]+F[+FX]-X}";
    result += "\\end{matrix}";

    theory.primaryEquationHeight = 55;
    theory.primaryEquationScale = 0.95;

    return result;
}

// [0],
// [0.5],
// [1],
// [0],
// [0]
//
// [0],
// [0.5],
// [1],
// [2],
// [2]
//
// [1],
// [1],
// [1.5],
// [2],
// [2]

// Symbols: EFX+-[] ([] are not calculated!)

var getSecondaryEquation = () =>
{
    let result = "\\begin{matrix}";
    result += "\\dot{\\rho}=c_1";
    if(c1Exp.level == 1) result += "^{1.02}";
    if(c1Exp.level == 2) result += "^{1.04}";
    if(c1Exp.level == 3) result += "^{1.06}";
    if(c1Exp.level == 4) result += "^{1.08}";
    if(c1Exp.level == 5) result += "^{1.10}";
    if(c1Exp.level == 6) result += "^{1.12}";
    result += "c_2\\log_{2}\\text{";
    switch(evolution.level)
    {
        case 0: result += "(0.5F+X)";
        break;
        case 1: result += "(0.5F+X+2(+)+2(-))";
        break;
        case 2: result += "(E+F+1.5X+2(+)+2(-))";
        break;
    }
    result += "}\\\\";
    result += theory.latexSymbol;
    result += "=\\max\\rho";
    result += "\\end{matrix}";

    if(evolution.level > 0)
        theory.secondaryEquationScale = 0.95;
    else
        theory.secondaryEquationScale = 1;
    theory.secondaryEquationHeight = 32;
    return result;
}

var getTertiaryEquation = () =>
{
    let result = "\\begin{matrix}";
    result += Localization.format(stringTickspeed, getTickspeed(tickLimiter.level).toString((tickLimiter.level > 0 ? 0 : 2)));
    result += "\\text{, bits: }";
    if(tickLimiter.level > 0)
    {
        result += ltsBitCount[tickLimiter.level - 1].toString() + "\\text{ (}" + bits.toString() + "\\text{)}";
    }
    else
        result += bits.toString();
    result += "\\end{matrix}";

    return result;
}

var getQuaternaryEntries = () =>
{
    if(quaternaryEntries.length == 0)
    {
        quaternaryEntries.push(new QuaternaryEntry("E", null));
        quaternaryEntries.push(new QuaternaryEntry("F", null));
        quaternaryEntries.push(new QuaternaryEntry("X", null));
        quaternaryEntries.push(new QuaternaryEntry("+", null));
        quaternaryEntries.push(new QuaternaryEntry("-", null));
    }

    if(evolution.level > 1)
        quaternaryEntries[0].value = rho[0][0].toString(0);
    else
        quaternaryEntries[0].value = null;
    quaternaryEntries[1].value = rho[0][1].toString(0);
    quaternaryEntries[2].value = rho[0][2].toString(0);
    if(evolution.level > 0)
    {
        quaternaryEntries[3].value = rho[0][3].toString(0);
        quaternaryEntries[4].value = rho[0][4].toString(0);
    }
    else
    {
        quaternaryEntries[3].value = null;
        quaternaryEntries[4].value = null;
    }

    return quaternaryEntries;
}

var getPublicationMultiplier = (tau) => tau.pow(0.192) / BigNumber.FOUR;
var getPublicationMultiplierFormula = (symbol) => "\\frac{{" + symbol + "}^{0.192}}{4}";
var getTau = () => currency.value;
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

var postPublish = () =>
{
    time = 0;
    rho = bigNumMat([[0, 0, 1, 0, 0]])
    theory.invalidateTertiaryEquation();
    theory.invalidateQuaternaryValues();
}

var getQ1 = (level) => (level < 1 ? 0 : BigNumber.from(1.28).pow(level - 1));
var getQ2 = (level) => BigNumber.FOUR.pow(level);
var getC1 = (level) => Utils.getStepwisePowerSum(level, 3, 6, 1);
var getC1Exponent = (level) => BigNumber.from(1 + 0.02 * level);
var getC2 = (level) => BigNumber.TWO.pow(level);
var getTickspeed = (level) => (level > 0 ? limitedTickspeed[level - 1] : getQ1(q1.level) * getQ2(q2.level));

init();