import * as esprima from 'esprima';
import * as escodegen from 'escodegen';
import * as js2flowchart from 'js2flowchart';

const createFlowChart = (codeToParse, userParams) => {
    let colorMap = {};
    const evalTree = parseCode(codeToParse, userParams, colorMap);
    console.log('~~~~~~~~~~~~~~~~evalTree~~~~~~~~~~~~~');
    console.log(evalTree);
    console.log(colorMap);

    const flowTree = js2flowchart.convertCodeToFlowTree(codeToParse);
    // console.log('~~~~~~~~~~~~~~~~flowTree~~~~~~~~~~~~~');
    // console.log(flowTree);

    // console.log('~~~~~~~~~~~~~~~~svgRender~~~~~~~~~~~~~');
    const svgRender = js2flowchart.createSVGRender();
    svgRender.applyBlackAndWhiteTheme();
    // console.log(svgRender);

    // console.log('~~~~~~~~~~~~~~~~shapesTree~~~~~~~~~~~~~');
    const shapesTree = svgRender.buildShapesTree(flowTree);
    // console.log(shapesTree);

    // console.log('~~~~~~~~~~~~~~~~shapesTreeEditor~~~~~~~~~~~~~');
    const shapesTreeEditor = js2flowchart.createShapesTreeEditor(shapesTree);
    // console.log(shapesTreeEditor);
    for (var key in colorMap){
        console.log(key);
        shapesTreeEditor.applyShapeStyles(
            shape => shape.getNodePathId() === key, {
                fillColor: '#008000'
            });
    }
    // console.log('~~~~~~~~~~~~~~~~shapesTreeEditor.print~~~~~~~~~~~~~');
    const output = (shapesTreeEditor.print({debug: true}));
    console.log(output);
    return output;
};


const parseCode = (codeToParse, userParams, colorMap) => {
    initTraverseHandler();
    let funcInput = esprima.parseScript(codeToParse);
    const jsParams = eval('[' + userParams + ']');
    let firstParsedTree = programTraverse(funcInput, colorMap, 'P-', jsParams);
    return firstParsedTree;
    // return createHtmlTag(firstParsedTree, '');
};

let traverseHandler = {};

const expTraverse = (ast, env, colorMap, branch, paramsEnv) => {
    try {
        return traverseHandler[ast.type](ast, env, colorMap, branch, paramsEnv);
    }
    catch (err) {
        return null;
    }
};
const programTraverse = (ast, colorMap, branch, jsParams) => {
    let env = {};
    ast.body = ast.body.map((bi) => expTraverse(bi, env, colorMap, branch, jsParams));
    return ast;
};

const functionTraverse = (ast, env, colorMap, branch, jsParams) => {
    let funcBranch = 'F' + branch;
    let paramsEnv = {};
    const params = ast.params.reduce((acc, p) => [...acc, p.name], []);
    params.map((p) => env[p] = p);
    for (let i = 0; i < jsParams.length; i++) {
        if (jsParams[i].length)
            paramsEnv[params[i]] = '[' + jsParams[i].toString() + ']';
        else
            paramsEnv[params[i]] = jsParams[i].toString();
    }
    ast.body = expTraverse(ast.body, env, colorMap, funcBranch, paramsEnv);
    return ast;
};

const blockTraverse = (ast, env, colorMap, branch, paramsEnv) => {
    ast.body = ast.body.map((bi) => expTraverse(bi, env, colorMap, branch, paramsEnv));
    return ast;
};

const substitute = (env, exp) => {
    if (exp.type == 'Identifier') {
        exp['name'] = env[exp.name];
    }
    else if (exp.type == 'BinaryExpression') {
        exp.left = substitute(env, exp.left);
        exp.right = substitute(env, exp.right);
    }
    else if (exp.type == 'ArrayExpression') {
        exp.elements = exp.elements.map((member) => substitute(env, member));
    }
    else if (exp.type == 'UnaryExpression') {
        exp.argument = substitute(env, exp.argument);
    }
    return substituteMember(env, exp);
};

const substituteMember = (env, exp) => {
    if (exp.type == 'MemberExpression') {
        if (env[escodegen.generate(exp)]) {
            exp = {type: 'Identifier', name: env[escodegen.generate(exp)]};
        }
        else {
            exp.object = substitute(env, exp.object);
            exp.property = substitute(env, exp.property);
        }
    }
    return exp;
};

const variableDeclTraverse = (ast, env, colorMap, branch) => {
    const genCode = escodegen.generate(ast);
    const backUpAst = esprima.parseScript(genCode).body[0];
    const updateEnv = (varDecl) => {
        let val = varDecl.init;
        if (val != undefined) {
            let pref = '';
            let post = '';
            if (val.type == 'BinaryExpression') {
                pref = '(';
                post = ')';
            }
            env[varDecl.id.name] = pref + escodegen.generate(substitute(env, val), {format: {compact: true}}) + post;
        }
        else env[varDecl.id.name] = null;
    };
    ast.declarations.map(updateEnv);
    addToColorMap(genCode, 'L' + branch, colorMap);
    return backUpAst;
};

const assignmentExpTraverse = (ast, env, colorMap, branch) => {
    console.log('assingmentt');
    console.log(branch);
    const genCode = escodegen.generate(ast);
    const backUpAst = esprima.parseScript(genCode).body[0];
    let pref = '';
    let post = '';
    if (ast.right.type == 'BinaryExpression') {
        pref = '(';
        post = ')';
    }
    extendsEnv(ast.left, pref + escodegen.generate(substitute(env, ast.right)) + post, env);
    addToColorMap(genCode, ast.left.name.toUpperCase() + branch, colorMap);
    return backUpAst;
};

const whileExpTraverse = (ast, env, colorMap, branch, paramsEnv) => {
    const genCode = escodegen.generate(ast.test);
    const backUpTest = esprima.parseScript(genCode).body[0];
    env = Object.assign({}, env);
    ast.test = substitute(env, ast.test);
    ast['isTestTrue'] = checkTest(ast.test, paramsEnv);
    addToColorMap('(' + genCode + ')', '(' + branch, colorMap);
    if (ast['isTestTrue'])
        ast.body = expTraverse(ast.body, env, colorMap, '(' + branch, paramsEnv);
    ast.test = backUpTest;
    return ast;
};

const ifExpTraverse = (ast, env, colorMap, branch, paramsEnv) => {
    const genCode = escodegen.generate(ast.test);
    const backUpTest = esprima.parseScript(genCode).body[0];
    let newEnv = Object.assign({}, env);
    ast.test = substitute(newEnv, ast.test);
    ast['isTestTrue'] = checkTest(ast.test, paramsEnv);
    addToColorMap('(' + genCode + ')', '(' + branch, colorMap);
    if (ast['isTestTrue']) {
        expTraverse(ast.consequent, Object.assign({}, newEnv), colorMap, '(' + branch, paramsEnv);
    }
    else {
        expTraverse(ast.alternate, Object.assign({}, newEnv), colorMap, '(' + branch, paramsEnv);
    }
    ast.test = backUpTest;
    return ast;
};

const checkTest = (ast, paramsEnv) => {
    const genCode = escodegen.generate(ast);
    let newAst = esprima.parseScript(genCode);
    newAst = substitute(paramsEnv, newAst.body[0].expression);
    return eval(escodegen.generate(newAst));
};

const returnTraverse = (ast, env, colorMap, branch) => {
    const genCode = escodegen.generate(ast);
    addToColorMap(genCode, 'R' + branch, colorMap);
    return ast;
};

const genExpTraverse = (ast, env, colorMap, branch, paramsEnv) => {
    ast.expression = expTraverse(ast.expression, env, colorMap, branch, paramsEnv);
    return ast;
};

const extendsEnv = (ast, rightSide, env) => {
    if (ast.type == 'Identifier') {
        env[ast.name] = rightSide;
    }
    else {  //ast.type == 'MemberExpression'
        env[escodegen.generate(ast)] = rightSide;
    }
};

const addToColorMap = (name, branch, colorMap) => {
    colorMap['NODE-ID:|' + nameToCapital(name) + '|' + branch] = true;
};

const nameToCapital = (expName) => {
    let upperName = expName.toUpperCase();
    if(upperName.charAt(upperName.length-1) == ';')
        upperName = upperName.substring(0,upperName.length-1);
    return upperName.replace(/ /g, '');
};


const initTraverseHandler = () => {
    traverseHandler['FunctionDeclaration'] = functionTraverse;
    traverseHandler['WhileStatement'] = whileExpTraverse;
    traverseHandler['IfStatement'] = ifExpTraverse;
    traverseHandler['VariableDeclaration'] = variableDeclTraverse;
    traverseHandler['ReturnStatement'] = returnTraverse;
    traverseHandler['ExpressionStatement'] = genExpTraverse;
    traverseHandler['AssignmentExpression'] = assignmentExpTraverse;
    traverseHandler['BlockStatement'] = blockTraverse;
};


export {createFlowChart, expTraverse};
