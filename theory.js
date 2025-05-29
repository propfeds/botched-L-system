import { BigNumber, parseBigNumber } from "../api/BigNumber";
import { CustomCost, ExponentialCost, FirstFreeCost, LinearCost } from "../api/Costs";
import { Localization } from "../api/Localization";
import { QuaternaryEntry, theory } from "../api/Theory";
import { Utils } from "../api/Utils";
import { Vector3 } from "../api/Vector3";

var id = "botched_L_system";
var name = "Botched L-system";
var description = "Your school's laboratory has decided to grow a fictional plant in the data room.\nBe careful of the implemented algorithms' limitations, else the database would slow down to a crawl, and eventually explode in a fatal ERROR.\n\nNote: the L-systems being drawn are of only level 4, instead of the actual size.";
var authors = "propfeds#5988";
var version = "0.16";

class LSystem
{
    constructor(axiom, rules, turnAngle = 30)
    {
        this.axiom = axiom;
        this.rules = new Map();
        for(let i = 0; i < rules.length; ++i)
        {
            if(rules[i] !== '')
            {
                let rs = rules[i].split('=');
                this.rules.set(rs[0], rs[1]);
            }
        }
        this.turnAngle = turnAngle;
    }

    derive(state)
    {
        let result = '';
        for(let i = 0; i < state.length; ++i)
        {
            if(this.rules.has(state[i]))
                result += this.rules.get(state[i]);
            else
                result += state[i];
        }
        return result;
    }

    toString()
    {
        let result = `${this.axiom} ${this.turnAngle}`;
        for(let [key, value] of this.rules)
        {
            result += ` ${key}=${value}`;
        }
        return result;
    }
}

class Renderer
{
    constructor(system, initScale = 1, figureScale = 2, cursorFocused = false, camX = 0, camY = 0, followFactor = 0.4, offlineDrawing = false, upright = false, quickDraw = false, quickBacktrack = false, extendedBacktrack = false)
    {
        this.system = system;
        this.initScale = initScale;
        this.figureScale = figureScale;
        this.cursorFocused = cursorFocused;
        this.camX = camX;
        this.camY = camY;
        this.followFactor = followFactor;
        this.offlineDrawing = offlineDrawing;
        this.upright = upright;
        this.quickDraw = quickDraw;
        this.quickBacktrack = quickBacktrack;
        this.extendedBacktrack = extendedBacktrack;

        this.state = new Vector3(0, 0, 0);
        this.levels = [];
        this.lvl = -1;
        this.stack = [];
        this.idStack = [];
        this.idx = 0;
        this.lastCamera = new Vector3(0, 0, 0);
    }

    update(level)
    {
        this.lvl = level;
        for(let i = this.levels.length; i <= level; ++i)
        {
            if(i == 0)
                this.levels[i] = `[${this.system.axiom}]`;
            else
                this.levels[i] = this.system.derive(this.levels[i - 1]);
        }
    }
    reset()
    {
        this.state = new Vector3(0, 0, 0);
        this.stack = [];
        this.idStack = [];
        this.idx = 0;
        if(stage == 1)
            theory.clearGraph();
        theory.invalidateTertiaryEquation();
    }
    configure(initScale, figureScale, cursorFocused, camX, camY, followFactor, offlineDrawing, upright, quickDraw, quickBacktrack, extendedBacktrack)
    {
        let requireReset = (initScale != this.initScale) || (figureScale != this.figureScale) || (upright != this.upright) || (quickDraw != this.quickDraw) || (quickBacktrack != this.quickBacktrack) || (extendedBacktrack != this.extendedBacktrack);

        this.initScale = initScale;
        this.figureScale = figureScale;
        this.cursorFocused = cursorFocused;
        this.camX = camX;
        this.camY = camY;
        this.followFactor = followFactor;
        this.offlineDrawing = offlineDrawing;
        this.upright = upright;
        this.quickDraw = quickDraw;
        this.quickBacktrack = quickBacktrack;
        this.extendedBacktrack = extendedBacktrack;

        if(requireReset)
            this.reset();
    }
    configureStaticCamera(initScale, figureScale, camX, camY, upright)
    {
        let requireReset = (initScale != this.initScale) || (figureScale != this.figureScale) || (upright != this.upright);

        this.initScale = initScale;
        this.figureScale = figureScale;
        this.camX = camX;
        this.camY = camY;
        this.upright = upright;

        if(requireReset)
            this.reset();
    }
    applySystem(system)
    {
        this.system = system;
        this.levels = [];
        this.update(0);
        this.reset();
    }

    turnLeft()
    {
        this.state = new Vector3(this.state.x, this.state.y, this.state.z + 1);
    }
    turnRight()
    {
        this.state = new Vector3(this.state.x, this.state.y, this.state.z - 1);
    }
    forward()
    {
        this.state = new Vector3(
            this.state.x + Math.cos(this.system.turnAngle * this.state.z * Math.PI / 180),
            this.state.y + Math.sin(this.system.turnAngle * this.state.z * Math.PI / 180),
            this.state.z
        );
    }
    centre()
    {
        if(this.cursorFocused)
            return -this.getCursor(this.lvl);
        else
        {
            if(this.upright)
                return new Vector3(
                    this.camY / this.initScale,
                    this.camX / this.initScale,
                    0
                );
            else
                return new Vector3(
                    -this.camX / this.initScale,
                    this.camY / this.initScale,
                    0
                );
        }
    }

    draw(level)
    {
        if(this.lvl != level)
            this.reset();
        this.update(level);

        let i;
        for(i = this.idx; i < this.levels[this.lvl].length; ++i)
        {
            switch(this.levels[this.lvl][i])
            {
                case '+': this.turnLeft(); break;
                case '-': this.turnRight(); break;
                case '[':
                    this.idStack.push(this.stack.length);
                    this.stack.push(this.state);
                    break;
                case ']':
                    this.state = this.stack.pop();
                    if(this.stack.length == this.idStack[this.idStack.length - 1])
                    {
                        this.idStack.pop();
                        this.idx = i + 1;
                        if(this.idx >= this.levels[this.lvl].length)
                            this.idx = 0;
                    }
                    return;
                default:
                    if(!this.quickBacktrack || backtrackList[this.extendedBacktrack ? 1 : 0].includes(this.levels[this.lvl][i + 1]))
                        this.stack.push(this.state);
                    this.forward();
                    this.idx = i + 1;
                    if(this.quickDraw)
                        break;
                    else
                        return;
            }
        }
    }

    getAngle()
    {
        return this.state.z * this.system.turnAngle % 360;
    }
    getProgress()
    {
        return this.idx * 100 / (this.levels[this.lvl].length - 1);
    }
    // getStateString()
    // {
    //     return `\\begin{matrix}x=${getCoordString(this.state.x)},&y=${getCoordString(this.state.y)},&a=${this.state.z},&i=${this.idx}/${this.levels[this.lvl].length}\\end{matrix}`;
    // }
    getCursor()
    {
        let coords = this.state / (this.initScale * this.figureScale ** this.lvl);
        if(this.upright)
            return new Vector3(coords.y, -coords.x, 0);
        else
            return new Vector3(coords.x, coords.y, 0);
    }
    getCamera()
    {
        if(this.cursorFocused)
        {
            let newCamera = this.centre() * this.followFactor + this.lastCamera * (1 - this.followFactor);
            this.lastCamera = newCamera;
            return newCamera;
        }
        else
            return this.centre();
    }
    toString()
    {
        return`${this.initScale} ${this.figureScale} ${this.cursorFocused ? 1 : 0} ${this.camX} ${this.camY} ${this.followFactor} ${this.offlineDrawing? 1 : 0} ${this.upright ? 1 : 0} ${this.quickDraw ? 1 : 0} ${this.quickBacktrack? 1 : 0} ${this.extendedBacktrack? 1 : 0}`;
    }
}

var getCoordString = (x) => x.toFixed(x >= 0 ? (x < 10 ? 3 : 2) : (x <= -10 ? 1 : 2));

var cultivarFF = new LSystem('X', ['F=FF', 'X=F-[[X]+X]+F[-X]-X'], 15);
var cultivarFXF = new LSystem('X', ['F=F[+F]XF', 'X=F-[[X]+X]+F[-FX]-X'], 27);
var cultivarXEXF = new LSystem('X', ['E=XEXF-', 'F=FX+[E]X', 'X=F-[X+[X[++E]F]]+F[X+FX]-X'], 22.5);
var systems = [cultivarFF, cultivarFXF, cultivarXEXF];
var renderer = new Renderer(cultivarFF, 1.5, 2, false, 1, 0, 0.4, false, true, false, false, false);
var configs =
[
    [1.5, 2, 1, 0, true],
    [1.5, 2, 0.25, 0.75, false],
    [1, 3, 0.75, -0.25, true]
];
var gameOffline = false;
var backtrackList = ['+-', '+-[]'];


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

// var bigNumMat = (array) => array.map((row) => row.map(x => BigNumber.from(x)));
var elemMatPow = (A, B) =>
    A.map((row, i) =>
        B[0].map((_, j) =>
            row.reduce((acc, _, n) =>
                acc + A[i][n].max(BigNumber.ONE).pow(B[n][j]), BigNumber.ZERO
            )
        )
    )

var diagMatPow = (A, n) => A.map((row) => row.map(x => x.pow(n)));

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

var printMat = (A) =>
{
    let row = "";
    for(let i = 0; i < A.length; i++)
    {
        for(let j = 0; j < A[i].length; j++)
            row += A[i][j].toString() + " ";
        log(row);
        row = "";
    }
}


// var stringTickspeed = "\\text{{" + Localization.get("TheoryPanelTickspeed", "}}q_1q_2\\text{{", "}}{0}\\text{{") + "}}";
var ruleStrings = [[
    null,
    "FF",
    "F-[[X]+X]+F[-X]-X",
    null,
    null
], [
    null,
    "F[+F]XF",
    "F-[[X]+X]+F[-FX]-X",
    null,
    null
], [
    "XEXF-",
    "FX+[E]X",
    "F-[X+[X[++E]F]]+F[X+FX]-X",
    null,
    null
]];
// Symbols: EFX+-[] ([] are not calculated!)
var symbols = ["E", "F", "X", "+", "-"];
var symUnlockLevel = [2, 0, 0, 1, 1];
// Axiom X
var rho = bigNumMat([[0, 0, 1, 0, 0]]);
// Production rules represented by matrices
var rules = [bigNumMat([
    [1, 0, 0, 0, 0],
    [0, 2, 0, 0, 0],
    [0, 2, 4, 2, 3],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1]
]), bigNumMat([
    [1, 0, 0, 0, 0],
    [0, 3, 1, 1, 0],
    [0, 3, 4, 2, 3],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1]
]), bigNumMat([
    [1, 1, 2, 0, 1],
    [1, 1, 2, 1, 0],
    [1, 4, 5, 5, 2],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1]
])];
// Used for diagonalised matrix powers
var v = [bigNumMat([
    [0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0],
    [-1, -2, 0, -1, 1],
    [0, 3, 0, 0, 0],
    [1, 0, 0, 0, 0]
]), bigNumMat([
    [0, 0, 1, 0, 0],
    [1, -1, 0, (-1-Math.sqrt(13))/6, (Math.sqrt(13)-1)/6],
    [-2, -1, 0, 1, 1],
    [0, 3, 0, 0, 0],
    [1, 0, 0, 0, 0]
]), bigNumMat([
    [-1, -5/3, 2, -7, 2],
    [-1, 2/3, -1, -4, 2],
    [1, 0, -1, 2, 5],
    [0, 0, 0, 3, 0],
    [0, 0, 3, 0, 0]
])];
// Used for diagonalised matrix powers
var diag = [bigNumMat([
    [1, 0, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 2, 0],
    [0, 0, 0, 0, 4]
]), bigNumMat([
    [1, 0, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, (7-Math.sqrt(13))/2, 0],
    [0, 0, 0, 0, (7+Math.sqrt(13))/2]
]), bigNumMat([
    [0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 7]
])];
// Used for diagonalised matrix powers
var vInv = [bigNumMat([
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1/3, 0],
    [1, 0, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 1, 2/3, 1]
]), bigNumMat([
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1/3, 0],
    [1, 0, 0, 0, 0],
    [0, -3/Math.sqrt(13), 1/2-1/(2*Math.sqrt(13)), 1/6-7/(6*Math.sqrt(13)), 1+2/Math.sqrt(13)],
    [0, 3/Math.sqrt(13), (13+Math.sqrt(13))/26, 1/6+7/(6*Math.sqrt(13)), 1-2/Math.sqrt(13)]
]), bigNumMat([
    [-10/49, -25/49, 2/7, -66/49, 3/49],
    [-3/7, 3/7, 0, -3/7, 3/7],
    [0, 0, 0, 0, 1/3],
    [0, 0, 0, 1/3, 0],
    [2/49, 5/49, 1/7, 20/147, 8/147]
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
    [1],
    [1.5],
    [1.5],
    [1.5]
]), bigNumMat([
    [1],
    [1.5],
    [2],
    [2],
    [2]
])];
var limitedTickspeed = bigNumList([0, 600, 5120, 5120]);
var ltsBitCount = [0, 4, 1];
var time = 0;
var stage = 0;
var bits = 0;
var tickPower = 0;
var origTickPower = 0;
var currency;
var q1, q2, c1, c2, tl;
var algo, tickLimiter, evolution, c1Exp;
var quaternaryEntries = [];
var bitCountMap = new Map();


var getQ1 = (level) => (level > 0 ? BigNumber.from(1.2).pow(level - 1) : 0);
var getQ2 = (level) => BigNumber.TWO.pow(level);
var getTickspeed = (level) => (level == 1 ? limitedTickspeed[tickLimiter.level] : getQ1(q1.level) * getQ2(q2.level));
var getC1 = (level) => Utils.getStepwisePowerSum(level, 3, 6, 1);
var getC1Exponent = (level) => BigNumber.from(1 + 0.02 * level);
var getC2 = (level) => BigNumber.TWO.pow(level);

var init = () =>
{
    currency = theory.createCurrency();

    // q1 (Tickspeed)
    // Starts with 0, then goes to 1 and beyond?
    {
        let getDesc = (level) => "q_1=" + (level > 0 ? "1.2^{" + (level - 1) + "}" : "\\text{off}");
        let getInfo = (level) => "q_1=" + getQ1(level).toString();
        q1 = theory.createUpgrade(0, currency, new FirstFreeCost(new ExponentialCost(7, 4)));
        q1.getDescription = (_) => Utils.getMath(getDesc(q1.level));
        q1.getInfo = (amount) => Utils.getMathTo(getInfo(q1.level), getInfo(q1.level + amount));
        q1.canBeRefunded = (_) => true;
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
        q2.canBeRefunded = (_) => true;
        q2.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
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
    // Tick limiter
    {
        let getDesc = (level) => "\\text{Tick limiter}=" + (level == 1 ? limitedTickspeed[level] + "/sec" : "\\text{off}");
        let getInfo = (level) => getDesc(level);
        tl = theory.createUpgrade(4, currency, new FreeCost);
        tl.getDescription = (_) => Utils.getMath(getDesc(tl.level));
        tl.getInfo = (amount) => Utils.getMathTo(getInfo(tl.level), getInfo(tl.level + amount));
        tl.maxLevel = 1;
        tl.canBeRefunded = (_) => true;
        tl.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
        tl.isAutoBuyable = false;
    }

    theory.createPublicationUpgrade(0, currency, 1e8);
    // Tick limiter: locks tickspeed to a certain value.
    // The first level will give a growth boost for a short while,
    // but the second level is better at lag prevention.
    // Lag is the stupid mechanic of this theory.
    {
        tickLimiter = theory.createPermanentUpgrade(1, currency, new CustomCost((level) =>
        {
            switch(level)
            {
                case 0: return BigNumber.from(1e16);
                case 1: return BigNumber.from(1e64);
            }
        }));
        tickLimiter.getDescription = (amount) => Localization.getUpgradeUnlockDesc("\\text{tick limiter}") + ` (${limitedTickspeed[tickLimiter.level + amount]}/sec)`;
        tickLimiter.info = "Locks tickspeed regardless of variable levels";
        tickLimiter.maxLevel = 2;
        tickLimiter.boughtOrRefunded = (_) => updateAvailability();
    }
    // Algorithms and Data Structures (TM)
    {
        algo = theory.createPermanentUpgrade(2, currency, new CustomCost((level) =>
        {
            switch(level)
            {
                case 0: return BigNumber.from(1e40);
                case 1: return BigNumber.from(1e112);
            }
        }));
        let getName = (level) =>
        {
            switch(level)
            {
                case 0: return "\\text{O}(m^3*n)\\text{ algorithm}";
                case 1: return "\\text{O}(m^3*\\text{log}n)\\text{ algorithm}";
                case 2: return "\\text{O}(m^3)\\text{ algorithm}";
                default: return "O(m^3)\\text{ diagonal algorithm}";
            }
        }
        algo.getDescription = (amount) => Localization.getUpgradeUnlockDesc(getName(algo.level + amount));
        algo.getInfo = (amount) => "Improves performance, certainly!";
        algo.maxLevel = 2;
        algo.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
    }
    theory.createBuyAllUpgrade(3, currency, 1e128);
    theory.createAutoBuyerUpgrade(4, currency, 1e160);

    // First unlock is at the same stage as auto-buyer
    theory.setMilestoneCost(new LinearCost(16, 8));
    // Branch weight: gives a flat income multiplication and literally no growth.
    {
        evolution = theory.createMilestoneUpgrade(0, 2);
        evolution.getDescription = (amount) => "Evolve into cultivar " + (evolution.level + amount < 2 ? "FXF" : "XEXF");
        evolution.getInfo = (amount) => Localization.getUpgradeUnlockInfo((evolution.level + amount < 2 ? "(+)/(-)" : "\\text{E}")) + "; " + Localization.getUpgradeIncCustomExpInfo("\\text{symbols'}", "0.5");
        evolution.boughtOrRefunded = (_) =>
        {
            renderer.applySystem(systems[evolution.level]);
            renderer.configureStaticCamera(configs[evolution.level][0], configs[evolution.level][1], configs[evolution.level][2], configs[evolution.level][3], configs[evolution.level][4]);
            theory.invalidatePrimaryEquation();
            theory.invalidateSecondaryEquation();
            theory.invalidateQuaternaryValues();
        }
    }

    // c1 exponent upgrade.
    {
        c1Exp = theory.createMilestoneUpgrade(1, 4);
        c1Exp.description = Localization.getUpgradeIncCustomExpDesc("c_1", "0.02");
        c1Exp.info = Localization.getUpgradeIncCustomExpInfo("c_1", "0.02");
        c1Exp.boughtOrRefunded = (_) => theory.invalidateSecondaryEquation();
    }

    let codexPoints = bigNumList([1e4, 1e8, 1e16, 1e24, 1e32]);
    // Achievements (Codex)
    let library = theory.createAchievementCategory(0, "Library");
    theory.createAchievement(0, library, "A Primer on L-systems", "Developed in 1968 by biologist Aristid Lindenmayer, an L-system is a formal grammar that describes the growth of a sequence (string), and was originally used to model the growth of a plant.\n\nThe syntax of L-systems:\nAxiom: the starting sequence\nRules: how the sequence expands each tick\nAny letter: move cursor forward\n+, -: turn cursor left/right\n[, ]: queue cursor positions on a stack", () => theory.tau > codexPoints[0], () => tauAchievementProgress(codexPoints[0]));
    
    theory.createAchievement(1, library, "The Current Algorithm", "An L-system can be represented as a 1*m horizontal matrix L counting each letter's occurrences in the sequence. Then, the production rules can be represented as a m*m square matrix P.\nWhen the L-system evolves, the next sequence can be calculated as follows:\nL(k+1)=L(k)*P\n\nThe current O(m^3*n) algorithm (with n as the tick power) performs n multiplications every tick, and therefore it is very slow.\nWatch out for your tick power.\n\nWarning: symbols are capped at ee6 due to precision issues.", () => theory.tau > codexPoints[1], () => tauAchievementProgress(codexPoints[1]));
    theory.createAchievement(2, library, "Binary Exponent Algorithm", "This newly implemented O(m^3*logn) algorithm instead represents the exponent n (tick power) as a binary number. Before any multiplication happens, it stores the exponents of the rules matrix P within a cache, like so:\n[P, P^2, P^4, P^8, ...]\nThen, to raise P to the power of n, we would only need to multiply the cached matrices based on the binary representation of n.\n\nTherefore, how fast the algorithm performs depends on the amount of '1' bits in n's binary representation.\n\nWarning: n has an internal limit of 2^31-1.", () => algo.level > 0);
    theory.createAchievement(3, library, "Diagonalised Algorithm", "Turns out, we can go faster than that. In this O(m^3) algorithm, we break down P into its eigenvector V and its diagonal matrix D:\nP=V*D*(V^-1)\nThen, P^n can be calculated by:\nP^n=V*(D^n)*(V^-1)\n\nCalculating D^n can be simply performed by raising every element to the power of n, massively improving the performance over previous algorithms.\n\nNote: Calculation of offline progress uses this algorithm.", () => algo.level > 1);

    theory.createAchievement(4, library, "Cultivar FF", "Represents a common source of carbohydrates.\nAxiom: X\nF→FF\nX→F-[[X]+X]+F[-X]-X", () => evolution.level > 0);
    theory.createAchievement(5, library, "Cultivar FXF", "Commonly called the Cyclone, cultivar FXF resembles a coil of barbed wire. Legends have it, once a snake moult has weathered enough, a new life is born unto the tattered husk, and from there, it stretches.\nAxiom: X\nF→F[+F]XF\nX→F-[[X]+X]+F[-FX]-X", () => evolution.level > 0);
    theory.createAchievement(6, library, "Cultivar XEXF", "Bearing the shape of a thistle, cultivar XEXF embodies the strength and resilience of nature against the harsh logarithm drop-off. It also smells really, really good.\nAxiom: X\nE→XEXF-\nF→FX+[E]X\nX→F-[X+[X[++E]F]]+F[X+FX]-X", () => evolution.level > 1);

    // Chapters
    chapter0 = theory.createStoryChapter(0, "Botched L-system", "Warning: This theory can ruin your save...\nif you fail.\n\n'I am very sure.\nWheat this fractal plant, we will be able to attract...\nfunding, for our further research!'\n\n'...Now turn it on, watch it rice, and the magic will happen.'\n\nTip: Visit the achievements to access the library for tutorials.", () => true);
    chapter1 = theory.createStoryChapter(1, "Limiter", "Our generation algorithm is barley even working...\n\nMy colleague told me that, in case of emergency,\nI should turn this limiter on to slow (?) down the computing.", () => tickLimiter.level > 0);
    chapter2 = theory.createStoryChapter(2, "Fractal Exhibition", "Our manager is arranging an exhibition next week,\nto showcase the lab's research on fractal curves.\n\nIs this lady out of her mind?\nOur generation algorithm is barley working...", () => evolution.level > 0);
    chapter3 = theory.createStoryChapter(3, "Nitpicking Exponents", "I heard our new engineer has implemented a new algorithm,\nand I heard that the more 1-bits that are on the exponent,\nthe more we have to process.\n\nAnd the fewer there are, the less likely we would face\na catastrophe, maybe?", () => algo.level > 0);
    chapter4 = theory.createStoryChapter(4, "Catharsis", "Finally.\nA good enough scientist who actually knows what they're doing.\nNo more famine, no more internal struggle.\nTo infinity and botch on!", () => algo.level > 1);
}

var updateAvailability = () =>
{
    tl.isAvailable = tickLimiter.level > 0;
}

// I copied this from Gilles' T1. Not copyrighted.
var tick = (elapsedTime, multiplier) =>
{
    let tickSpeed = getTickspeed(tl.level);

    if(tickSpeed.isZero)
        return;
    
    let timeLimit = 1 / tickSpeed.Min(BigNumber.TEN).toNumber();
    time += elapsedTime;

    if(time >= timeLimit - 1e-8)
    {
        if(stage == 1)
        {
            if(game.isCalculatingOfflineProgress)
                gameOffline = true;
            else if(gameOffline)
            {
                // Probably triggers only once when reloading
                if(!renderer.offlineDrawing)
                    renderer.reset();
                gameOffline = false;
            }
            if(!gameOffline || renderer.offlineDrawing)
            {
                renderer.draw(4);
            }
        }

        if(algo.level == 2 || game.isCalculatingOfflineProgress)
            tickPower = tickSpeed * BigNumber.from(time);
        else
        {
            tickPower = Math.min(Math.round(tickSpeed.toNumber() * time), 0x7FFFFFFF);
            if(tl.level == 1)
                origTickPower = Math.min(Math.round(getTickspeed(0).toNumber() * time), 0x7FFFFFFF);
        }
            
        // log(tickPower);

        let bonus = theory.publicationMultiplier * multiplier;
        let vc1 = getC1(c1.level).pow(getC1Exponent(c1Exp.level));
        let vc2 = getC2(c2.level);

        let growth;
        if(algo.level == 2 || game.isCalculatingOfflineProgress)
        {
            growth = matMul(matMul(v[evolution.level], diagMatPow(diag[evolution.level], tickPower)), vInv[evolution.level]);
            rho = matMul(rho, growth);
        }
        else if(algo.level == 1)
        {
            growth = matPow(rules[evolution.level], tickPower, rulePowers[evolution.level]);
            rho = matMul(rho, growth);
        }
        else
        {
            for(let i = 0; i < tickPower; ++i)
                rho = matMul(rho, rules[evolution.level]);
        }
        
        currency.value += (elemMatPow(rho, weight[evolution.level])[0][0]).log2() * bonus * vc1 * vc2;

        if(tickSpeed > BigNumber.TEN)
            time = 0;
        else
            time -= timeLimit;

        if(stage == 0)
        {
            theory.invalidateTertiaryEquation();
            theory.invalidateQuaternaryValues();
        };
    }
}

var getInternalState = () => `${time} ${rho[0][0]} ${rho[0][1]} ${rho[0][2]} ${rho[0][3]} ${rho[0][4]}`

var setInternalState = (state) =>
{
    let values = state.split(" ");
    if(values.length > 0) time = parseBigNumber(values[0]);
    if(values.length > 1) rho[0][0] = parseBigNumber(values[1]);
    if(values.length > 2) rho[0][1] = parseBigNumber(values[2]);
    if(values.length > 3) rho[0][2] = parseBigNumber(values[3]);
    if(values.length > 4) rho[0][3] = parseBigNumber(values[4]);
    if(values.length > 5) rho[0][4] = parseBigNumber(values[5]);
}

var alwaysShowRefundButtons = () =>
{
    return true;
}

var getPrimaryEquation = () =>
{
    if(stage == 0)
    {
        let result = "\\begin{matrix}";
        result += "Axiom\:\\text{X}\\\\";
        for(let i = 0; i < 3; i++)
        {
            if(ruleStrings[evolution.level][i])
            {
                result += "\\text{";
                result += symbols[i];
                result += "}\\rightarrow{}\\text{";
                result += ruleStrings[evolution.level][i];
                if(evolution.level == 2 && i == 0)
                    result += ", }";
                else if(i < 2)
                    result += "}\\\\";
                else
                    result += "}";
            }
        }
        result += "\\end{matrix}";

        let primaryScale = [0.95, 0.9, 0.75];
        let primaryHeight = [55, 50, 40];
        theory.primaryEquationScale = primaryScale[evolution.level];
        theory.primaryEquationHeight = primaryHeight[evolution.level];
        return result;
    }
    return "";
}

var getSecondaryEquation = () =>
{
    if(stage == 0)
    {
        let result = "\\begin{matrix}";
        result += "\\dot{\\rho}=c_1";
        if(c1Exp.level > 0)
        {
            result += "^{";
            result += getC1Exponent(c1Exp.level);
            result += "}";
        }
        result += "c_2\\log_{2}\\text{";
        switch(evolution.level)
        {
            case 0: result += "({F}^{0.5}+X)";
            break;
            case 1: result += "(F+{X}^{1.5}+{(+)}^{1.5}+{(-)}^{1.5})";
            break;
            case 2: result += "(E+{F}^{1.5}+{X}^{2}+{(+)}^{2}+{(-)}^{2})";
            break;
        }
        result += "}\\\\";
        result += theory.latexSymbol;
        result += "=\\max{\\rho}^{0.5}";
        result += "\\end{matrix}";

        theory.secondaryEquationScale = 1 - 0.05 * evolution.level;
        theory.secondaryEquationHeight = 35;
        return result;
    }
    return "";
}

var getTertiaryEquation = () =>
{
    if(stage == 0)
    {
        let result = "\\begin{matrix}";
        result += "\\text{Tick power}:q_1q_2/10=";
        result += tickPower.toString();
        if(algo.level == 1)
        {
            if(tl.level == 1)
            {
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
            result += ",&\\text{bits}:";
            if(tl.level == 1)
            {
                result += ltsBitCount[tickLimiter.level].toString() + "\\text{ (}" + bits.toString() + "\\text{)}";
            }
            else
                result += bits.toString();
        }
        result += "\\end{matrix}";

        return result;
    }
    return "";
}

var getQuaternaryEntries = () =>
{
    if(stage == 0)
    {
        if(quaternaryEntries.length == 0)
            for(let i = 0; i < 5; i++)
                quaternaryEntries.push(new QuaternaryEntry(symbols[i], null));

        for(let i = 0; i < 5; i++)
        {
            if(evolution.level >= symUnlockLevel[i])
                quaternaryEntries[i].value = rho[0][i].toString(0);
            else
                quaternaryEntries[i].value = null;
        }

        return quaternaryEntries;
    }
    return [];
}

var canGoToPreviousStage = () => stage > 0;
var goToPreviousStage = () =>
{
    --stage;
    theory.clearGraph();
    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
    theory.invalidateQuaternaryValues();
};
var canGoToNextStage = () => stage < 1;
var goToNextStage = () =>
{
    ++stage;
    theory.invalidatePrimaryEquation();
    theory.invalidateSecondaryEquation();
    theory.invalidateTertiaryEquation();
    theory.invalidateQuaternaryValues();
    
    renderer.applySystem(systems[evolution.level]);
    renderer.configureStaticCamera(configs[evolution.level][0], configs[evolution.level][1], configs[evolution.level][2], configs[evolution.level][3], configs[evolution.level][4]);
};

var getPublicationMultiplier = (tau) => tau.pow(0.384) / BigNumber.TWO;
var getPublicationMultiplierFormula = (symbol) => "\\frac{" + "{" + symbol + "}^{0.384}" + "}{2}";
var getTau = () => currency.value.pow(BigNumber.from(0.5));
var getCurrencyFromTau = (tau) => [tau.max(BigNumber.ONE).pow(BigNumber.TWO), currency.symbol];
var tauAchievementProgress = (goal) => (theory.tau.max(BigNumber.ONE).log2() / goal.log2()).toNumber();

var get2DGraphValue = () =>
{
    if(stage == 1)
        return 0;
    switch(algo.level)
    {
        case 0: return Math.log2(Math.max(tickPower, 1));
        case 1: return (tl.level == 1 ? ltsBitCount[tickLimiter.level] : bits);
        case 2: return (BigNumber.ONE + currency.value.abs()).log10().toNumber();
    }
};
var get3DGraphPoint = () => 
{
    if(stage == 0)
        return new Vector3(0, 0, 0);
    return renderer.getCursor();
}
var get3DGraphTranslation = () => 
{
    if(stage == 0)
        return new Vector3(0, 0, 0);
    return renderer.getCamera();
}

var postPublish = () =>
{
    time = 0;
    bits = 0;
    tickPower = 0;
    origTickPower = 0;
    bitCountMap.clear();
    rho = bigNumMat([[0, 0, 1, 0, 0]]);
    theory.invalidateTertiaryEquation();
    theory.invalidateQuaternaryValues();
}


init();
