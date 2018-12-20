import * as esprima from 'esprima';
import * as escodegen from 'escodegen';
import * as js2flowchart from 'js2flowchart';

let colorMap = {};

function createFlowChart(codeToParse, userParams) {
    colorMap = {};
    parseCode(codeToParse, userParams, colorMap);
    const flowTree = js2flowchart.convertCodeToFlowTree(codeToParse);
    const svgRender = js2flowchart.createSVGRender();
    svgRender.applyBlackAndWhiteTheme();
    const shapesTree = svgRender.buildShapesTree(flowTree);
    const shapesTreeEditor = js2flowchart.createShapesTreeEditor(shapesTree);
    for (const key in colorMap) {
        shapesTreeEditor.applyShapeStyles(
            shape => shape.getNodePathId() === key, {
                fillColor: '#008000'
            });
    }
    return (shapesTreeEditor.print({debug: true}));
}

function parseCode(codeToParse, userParams, colorMap) {
    initTraverseHandler();
    let funcInput = esprima.parseScript(codeToParse);
    const jsParams = eval('[' + userParams + ']');
    programTraverse(funcInput, colorMap, 'P-', jsParams);
}

let traverseHandler = {};

function expTraverse(ast, env, colorMap, branch, paramsEnv) {
    traverseHandler[ast.type](ast, env, colorMap, branch, paramsEnv);
}

const programTraverse = (ast, colorMap, branch, jsParams) => {
    let env = {};
    ast.body.map((bi) => expTraverse(bi, env, colorMap, branch, jsParams));
};

const functionTraverse = (ast, env, colorMap, branch, jsParams) => {
    let funParams = '(';
    let paramsEnv = {};
    const params = ast.params.reduce((acc, p) => [...acc, p.name], []);
    params.map((p) => {
        funParams += p + ',';
        return env[p] = p;
    });
    for (let i = 0; i < jsParams.length; i++) {
        if (jsParams[i].length)
            paramsEnv[params[i]] = '[' + jsParams[i].toString() + ']';
        else
            paramsEnv[params[i]] = jsParams[i].toString();
    }
    if(ast.params.length > 0){
        funParams = funParams.substring(0,funParams.length-1);
    }
    addToColorMap('FUNCTION' + ast.id.name+funParams + ')', 'F' + branch, colorMap);
    expTraverse(ast.body, env, colorMap, 'F' + branch, paramsEnv);
};

const blockTraverse = (ast, env, colorMap, branch, paramsEnv) => {
    ast.body.map((bi) => expTraverse(bi, env, colorMap, branch, paramsEnv));
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
};

const assignmentExpTraverse = (ast, env, colorMap, branch) => {
    const genCode = escodegen.generate(ast);
    let pref = '';
    let post = '';
    if (ast.right.type == 'BinaryExpression') {
        pref = '(';
        post = ')';
    }
    let assignName;
    if(ast.left.type == 'MemberExpression')
        assignName = nameToCapital(ast.left.object.name).charAt(0);
    else
        assignName = nameToCapital(ast.left.name).charAt(0);
    extendsEnv(ast.left, pref + escodegen.generate(substitute(env, ast.right)) + post, env);
    addToColorMap(genCode, assignName + branch, colorMap);
};

const whileExpTraverse = (ast, env, colorMap, branch, paramsEnv) => {
    const genCode = escodegen.generate(ast.test);
    env = Object.assign({}, env);
    ast.test = substitute(env, ast.test);
    const itTestTrue = checkTest(ast.test, paramsEnv);
    const whileName = nameToCapital(genCode).charAt(0);
    addToColorMap(genCode, whileName + branch, colorMap);
    if (itTestTrue)
        expTraverse(ast.body, env, colorMap, whileName + branch, paramsEnv);
};

const ifExpTraverse = (ast, env, colorMap, branch, paramsEnv) => {
    const genCode = escodegen.generate(ast.test);
    let newEnv = Object.assign({}, env);
    ast.test = substitute(newEnv, ast.test);
    const itTestTrue = checkTest(ast.test, paramsEnv);
    addToColorMap('(' + genCode + ')', '(' + branch, colorMap);
    if (itTestTrue) {
        expTraverse(ast.consequent, Object.assign({}, newEnv), colorMap, '(' + branch, paramsEnv);
    }
    else {
        expTraverse(ast.alternate, Object.assign({}, newEnv), colorMap, '(' + branch, paramsEnv);
    }
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
};

const genExpTraverse = (ast, env, colorMap, branch, paramsEnv) => {
    ast.expression = expTraverse(ast.expression, env, colorMap, branch, paramsEnv);
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
    if (upperName.charAt(upperName.length - 1) == ';')
        upperName = upperName.substring(0, upperName.length - 1);
    const upperResult =  upperName.replace(/ |\n/g, '');
    return upperResult.replace(/'/g, '"');
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

export {createFlowChart,colorMap};
