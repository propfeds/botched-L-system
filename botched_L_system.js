import { ExponentialCost, FirstFreeCost, LinearCost } from "../api/Costs";
import { Localization } from "../api/Localization";
import { BigNumber } from "../api/BigNumber";
import { QuaternaryEntry, theory } from "../api/Theory";
import { Utils } from "../api/Utils";

var id = "botched_L_system";
var name = "Botched L-system";
var description = "Your school's laboratory has decided to grow a fictional tree in the data room.\n\nBe careful of its exponential growth, and try to stop it before the database slows down to a crawl and eventually explode in a fatal ERROR.\n\nAn explanation of L-systems:\n\nAxiom: the starting sequence\nRules: how the sequence expands each tick\nF: moves cursor forward to create a line\nX: acts like a seed for branches\n-, +: turns cursor left/right\n[, ]: allows for branches, by queueing\ncursor positions on a stack\n\nThis theory will not draw a tree based on these rules due to the sheer size, but only simulates the number of characters in the sequence.";
var authors = "propfeds#5988 (propsuki)";
var version = 0.4;  // Will be 0.5 after self-testing, then send to Discord


var bigNumMat = (array) => array.map((row) => row.map(x => BigNumber.from(x)));
var bigNumList = (array) => array.map(x => BigNumber.from(x));

var idMat = (size) =>
{
    var result = [];
    for(var i = 0; i < size; i++)
    {
        result[i] = [];
        for(var j = 0; j < size; j++)
        {
            if(i==j)
                result[i][j] = BigNumber.ONE;
            else
                result[i][j] = BigNumber.ZERO;
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
            var sum = BigNumber.ZERO;
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
        log(row);
        row = "";
    }
}


var stringTickspeed = "\\text{{" + Localization.get("TheoryPanelTickspeed", "}}q_1q_2\\text{{", "}}{0}\\text{{") + "}}";

// Axiom X
// F --> FF
// X --> F-[[X]+X]+F[+FX]-X
// ø = 22.5
// Symbols: FX+-[]

var rho = bigNumMat([[0, 1, 0, 0, 0, 0]]);
var rules = bigNumMat([
    [2, 0, 0, 0, 0, 0],
    [3, 4, 3, 2, 3, 3],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 1]
]);
var rulePowers = [rules];
var weight = bigNumMat([
    [0.5],
    [1],
    [0],
    [0],
    [0],
    [0]
]);
var weightWithBranch = bigNumMat([
    [0.5],
    [1],
    [2],
    [2],
    [0],
    [0]
]);
var limitedTickspeed = bigNumList([640, 10]);
var time = 0;
var currency;
var q1, q2, c1, c2;
var tickLimiter, branchWeight, c1Exp;
var quaternaryEntries = [];


var init = () =>
{
    currency = theory.createCurrency();

    // q1 (Tickspeed)
    // Starts with 0, then goes to 1 and beyond?
    {
        let getDesc = (level) => "q_1=" + (level > 0 ? "1.28^{" + (level - 1) + "}" : "\\text{off}");
        let getDescNum = (level) => "q_1=" + getQ1(level).toString();
        q1 = theory.createUpgrade(0, currency, new FirstFreeCost(new ExponentialCost(7, 4)));
        q1.getDescription = (_) => Utils.getMath(getDesc(q1.level));
        q1.getInfo = (amount) => Utils.getMathTo(getDescNum(q1.level), getDescNum(q1.level + amount));
        q1.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
    }
    // q2 (Tickspeed)
    // Literally the same as q1, just more expensive
    {
        let getDesc = (level) => "q_2=2^{" + level + "}";
        let getInfo = (level) => "q_2=" + getQ2(level).toString(0);
        q2 = theory.createUpgrade(1, currency, new ExponentialCost(1e4, Math.log2(1e4)));
        q2.getDescription = (_) => Utils.getMath(getDesc(q2.level));
        q2.getInfo = (amount) => Utils.getMathTo(getInfo(q2.level), getInfo(q2.level + amount));
        q2.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
    }
    // c1
    {
        let getDesc = (level) => "c_1=" + getC1(level).toString(0);
        c1 = theory.createUpgrade(2, currency, new ExponentialCost(1e5, Math.log2(1.6)));
        c1.getDescription = (_) => Utils.getMath(getDesc(c1.level));
        c1.getInfo = (amount) => Utils.getMathTo(getDesc(c1.level), getDesc(c1.level + amount));
    }
    // c2
    {
        let getDesc = (level) => "c_2=2^{" + level + "}";
        let getInfo = (level) => "c_2=" + getC2(level).toString(0);
        c2 = theory.createUpgrade(3, currency, new ExponentialCost(3e9, 6));
        c2.getDescription = (_) => Utils.getMath(getDesc(c2.level));
        c2.getInfo = (amount) => Utils.getMathTo(getInfo(c2.level), getInfo(c2.level + amount));
    }

    // Auto-buyer comes first to create a sense of leisure
    theory.createPublicationUpgrade(0, currency, 1e8);
    theory.createAutoBuyerUpgrade(1, currency, 1e16);
    theory.createBuyAllUpgrade(2, currency, 1e24);

    // First unlock is at the same stage as auto-buyer
    theory.setMilestoneCost(new LinearCost(16, 16));

    // Tick limiter: locks tickspeed to a certain value.
    // The first level will most likely give a growth boost,
    // but the second level acts more like lag prevention.
    // Lag is the main mechanic of this theory.
    {
        tickLimiter = theory.createMilestoneUpgrade(0, 2);
        tickLimiter.getDescription = (_) => Localization.format("Limits tickspeed to {0}", tickLimiter.level > 0 ? "10" : "640");
        tickLimiter.info = "Locks tickspeed regardless of variable levels";
        tickLimiter.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
    }

    // Branch weight: gives a flat multiplication bonus.
    {
        branchWeight = theory.createMilestoneUpgrade(1, 1);
        branchWeight.description = Localization.getUpgradeIncCustomDesc("(+)/(-)", "2") + " in weight";
        branchWeight.info = "Raises awareness about the beauty of fractal curves";
        branchWeight.boughtOrRefunded = (_) =>
        {
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

    chapter1 = theory.createStoryChapter(0, "L-system", "I am very sure.\nWheat this fractal plant, we will be able to attract...\nfunding, for our further research.\n\nNow turn it on, and watch the magic happen.", () => true);
}

// I copied this from Gilles' T1. Not copyrighted.
var tick = (elapsedTime, multiplier) =>
{
    let tickspeed = getTickspeed(tickLimiter.level);

    if(tickspeed.isZero)
        return;
    
    let timeLimit = 1 / tickspeed.Min(BigNumber.TEN).toNumber();
    time += elapsedTime;

    if(time >= timeLimit-1e-8)
    {
        let tickPower = tickspeed*BigNumber.from(time*multiplier);

        let bonus = theory.publicationMultiplier;
        let vc1 = getC1(c1.level).pow(getC1Exponent(c1Exp.level));
        let vc2 = getC2(c2.level);
        let exp = matPow(rules, Math.floor(tickPower.toNumber()));
        rho = matMul(rho, exp);
        currency.value += (matMul(rho, getWeight(branchWeight.level))[0][0]).log2() * bonus * vc1 * vc2;

        time -= timeLimit;
        theory.invalidateQuaternaryValues();
    }
}

var getInternalState = () => `${rho[0][0]} ${rho[0][1]} ${rho[0][2]} ${rho[0][3]} ${rho[0][4]} ${rho[0][5]} ${time}`

var setInternalState = (state) =>
{
    let values = state.split(" ");
    if(values.length > 0) rho[0][0] = parseBigNumber(values[0]);
    if(values.length > 1) rho[0][1] = parseBigNumber(values[1]);
    if(values.length > 2) rho[0][2] = parseBigNumber(values[2]);
    if(values.length > 3) rho[0][3] = parseBigNumber(values[3]);
    if(values.length > 4) rho[0][4] = parseBigNumber(values[4]);
    if(values.length > 5) rho[0][5] = parseBigNumber(values[5]);
    if(values.length > 6) time = parseBigNumber(values[6]);
}

var getPrimaryEquation = () =>
{
    let result = "\\begin{matrix}";
    result += "Axiom\:\\text{X}\\\\";
    result += "\\text{F}\\rightarrow{}\\text{FF}\\\\";
    result += "\\text{X}\\rightarrow{}\\text{F-[[X]+X]+F[+FX]-X}";
    result += "\\end{matrix}";

    theory.primaryEquationHeight = 55;
    theory.primaryEquationScale = 0.95;

    return result;
}

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
    result += "c_2\\log_{2}(0.5F+X";
    if(branchWeight.level > 0) result += "+2(+)+2(-)";
    result += ")\\\\";
    result += theory.latexSymbol;
    result += "=\\max\\rho";
    result += "\\end{matrix}";

    // theory.secondaryEquationScale = 0.95;
    theory.secondaryEquationHeight = 32;
    return result;
}

var getTertiaryEquation = () => Localization.format(stringTickspeed, getTickspeed(tickLimiter.level).toString());

var getQuaternaryEntries = () =>
{
    if(quaternaryEntries.length == 0)
    {
        quaternaryEntries.push(new QuaternaryEntry("F", null));
        quaternaryEntries.push(new QuaternaryEntry("X", null));
        quaternaryEntries.push(new QuaternaryEntry("+", null));
        quaternaryEntries.push(new QuaternaryEntry("-", null));
    }

    quaternaryEntries[0].value = rho[0][0].toString();
    quaternaryEntries[1].value = rho[0][1].toString();
    if(branchWeight.level > 0)
    {
        quaternaryEntries[2].value = rho[0][2].toString();
        quaternaryEntries[3].value = rho[0][3].toString();
    }

    return quaternaryEntries;
}

var getPublicationMultiplier = (tau) => tau.pow(0.16) / BigNumber.TWO;
var getPublicationMultiplierFormula = (symbol) => "\\frac{{" + symbol + "}^{0.16}}{2}";
var getTau = () => currency.value;
var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

var postPublish = () =>
{
    time = 0;
    rho = bigNumMat([[0, 1, 0, 0, 0, 0]])
    theory.invalidateTertiaryEquation();
}

var getQ1 = (level) => (level > 0 ? BigNumber.from(1.28).pow(level - 1) : 0);
var getQ2 = (level) => BigNumber.TWO.pow(level);
var getC1 = (level) => Utils.getStepwisePowerSum(level, 3, 6, 1);
var getC1Exponent = (level) => BigNumber.from(1 + 0.02 * level);
var getC2 = (level) => BigNumber.TWO.pow(level);
var getTickspeed = (level) => (level > 0 ? limitedTickspeed[level - 1] : getQ1(q1.level) * getQ2(q2.level));
var getWeight = (level) => (level > 0 ? weightWithBranch : weight);

init();