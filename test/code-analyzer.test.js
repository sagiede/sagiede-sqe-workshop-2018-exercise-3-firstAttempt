import assert from 'assert';
import * as codeAnalyzer from '../src/js/code-analyzer';

describe('general Test', () => {
    const userInput = '1,2,[0,3,0]';
    let funcInput = '    let cc = 2 + 1;\n' +
        'function foo(x, y, z){\n' +
        '    let a = x + 1;\n' +
        '    let b = a + y;\n' +
        '    let c = 0;\n' +
        '    \n' +
        '    if ((b < z[1])) {\n' +
        '        c = c + 5;\n' +
        '    } else if (b < z[x] * 2) {\n' +
        'd = c + x + 5;\n' +
        'let d = a + y;\n' +
        '       \n' +
        '    } else {\n' +
        '        c = c + z + 5;\n' +
        '    }\n' +
        '    \n' +
        '    return c;\n' +
        '}';
    let expecColorMap = {};
    expecColorMap['NODE-ID:|(B<Z[1])|(FP-'] = true;
    expecColorMap['NODE-ID:|(B<Z[X]*2)|((FP-'] = true;
    expecColorMap['NODE-ID:|D=C+X+5|D((FP-'] = true;
    expecColorMap['NODE-ID:|FUNCTIONFOO(X,Y,Z)|FP-'] = true;
    expecColorMap['NODE-ID:|LETA=X+1|LFP-'] = true;
    expecColorMap['NODE-ID:|LETB=A+Y|LFP-'] = true;
    expecColorMap['NODE-ID:|LETC=0|LFP-'] = true;
    expecColorMap['NODE-ID:|LETCC=2+1|LP-'] = true;
    expecColorMap['NODE-ID:|LETD=A+Y|L((FP-'] = true;
    expecColorMap['NODE-ID:|RETURNC|RFP-'] = true;
    it('test1', () => {
        codeAnalyzer.createFlowChart(funcInput, userInput);
        assert.deepEqual(codeAnalyzer.colorMap, expecColorMap);
    });
    let funcInput2 = '    let cc = 2 + 1;\n' +
        'function foo(x, y, z){\n' +
        '    let a = x + 1;\n' +
        '    let b = a + y;\n' +
        '    let c = 0;\n' +
        '    \n' +
        '    if ((b < z[1])) {\n' +
        '        c = c + 5;\n' +
        '    } else if (b < z[x+1] * 2) {\n' +
        'd = c + x + 5;\n' +
        'let d = a + y;\n' +
        '       \n' +
        '    } else {\n' +
        '        c = c + z + 5;\n' +
        '    }\n' +
        '    \n' +
        '    return c;\n' +
        '}';
    let expecColorMap2 = {};
    expecColorMap2['NODE-ID:|(B<Z[1])|(FP-'] = true;
    expecColorMap2['NODE-ID:|(B<Z[X+1]*2)|((FP-'] = true;
    expecColorMap2['NODE-ID:|FUNCTIONFOO(X,Y,Z)|FP-'] = true;
    expecColorMap2['NODE-ID:|LETA=X+1|LFP-'] = true;
    expecColorMap2['NODE-ID:|LETB=A+Y|LFP-'] = true;
    expecColorMap2['NODE-ID:|LETC=0|LFP-'] = true;
    expecColorMap2['NODE-ID:|LETCC=2+1|LP-'] = true;
    expecColorMap2['NODE-ID:|RETURNC|RFP-'] = true;
    expecColorMap2['NODE-ID:|C=C+Z+5|C((FP-'] = true;

    it('test2', () => {
        codeAnalyzer.createFlowChart(funcInput2, userInput);
        assert.deepEqual(codeAnalyzer.colorMap, expecColorMap2);
    });

    const userInput3 = '1,2';
    let funcInput3 = 'function foo(x, var1){\n' +
        '  let counter = x + 1;\n' +
        '  while ((counter + 1)  < 10){\n' +
        '    if ( var1 == 8){\n' +
        '        return true;\n' +
        '    }\n' +
        '     else {\n' +
        '        var1 = var1 +1;\n' +
        '     }\n' +
        '  }\n' +
        '}';
    let expecColorMap3 = {};
    expecColorMap3['NODE-ID:|(VAR1==8)|(CFP-'] = true;
    expecColorMap3['NODE-ID:|COUNTER+1<10|CFP-'] = true;
    expecColorMap3['NODE-ID:|FUNCTIONFOO(X,VAR1)|FP-'] = true;
    expecColorMap3['NODE-ID:|LETCOUNTER=X+1|LFP-'] = true;
    expecColorMap3['NODE-ID:|VAR1=VAR1+1|V(CFP-'] = true;
    it('test3', () => {
        codeAnalyzer.createFlowChart(funcInput3, userInput3);
        assert.deepEqual(codeAnalyzer.colorMap, expecColorMap3);
    });

    const userInput4 = '1,2';
    let funcInput4 = 'function foo(x, var1){\n' +
        '  let counter = x + 1;\n' +
        '  while ((counter + 1)  > 10){\n' +
        '    if ( var1 == 8){\n' +
        '        return true;\n' +
        '    }\n' +
        '     else {\n' +
        '        var1 = var1 +1;\n' +
        '     }\n' +
        '  }\n' +
        '}';
    let expecColorMap4 = {};
    expecColorMap4['NODE-ID:|COUNTER+1>10|CFP-'] = true;
    expecColorMap4['NODE-ID:|FUNCTIONFOO(X,VAR1)|FP-'] = true;
    expecColorMap4['NODE-ID:|LETCOUNTER=X+1|LFP-'] = true;
    it('test4', () => {
        codeAnalyzer.createFlowChart(funcInput4, userInput4);
        assert.deepEqual(codeAnalyzer.colorMap, expecColorMap4);
    });
});

describe('simple unary and member tests', () => {
    const userInput1 = '20';
    const funcInput1 = 'function foo(x){\n' +
        '    let a = [x,x+1];\n' +
        '    a[0] = 1;\n' +
        '    if(x > 1){\n' +
        '       return a[0];\n' +
        '    }\n' +
        '}';
    let expecColorMap1 = {};
    expecColorMap1['NODE-ID:|(X>1)|(FP-'] = true;
    expecColorMap1['NODE-ID:|A[0]=1|AFP-'] = true;
    expecColorMap1['NODE-ID:|FUNCTIONFOO(X)|FP-'] = true;
    expecColorMap1['NODE-ID:|LETA=[X,X+1]|LFP-'] = true;
    expecColorMap1['NODE-ID:|RETURNA[0]|R(FP-'] = true;
    it('test1', () => {
        codeAnalyzer.createFlowChart(funcInput1, userInput1);
        assert.deepEqual(codeAnalyzer.colorMap, expecColorMap1);
    });

    const userInput2 = 'true';
    const funcInput2 = 'function foo(x){\n' +
        '    let a = true;\n' +
        '    let b = !a;\n' +
        '    let c = a & b;\n' +
        '    return c;\n' +
        '}';
    let expecColorMap2 = {};
    expecColorMap2['NODE-ID:|FUNCTIONFOO(X)|FP-'] = true;
    expecColorMap2['NODE-ID:|LETA=TRUE|LFP-'] = true;
    expecColorMap2['NODE-ID:|LETB=!A|LFP-'] = true;
    expecColorMap2['NODE-ID:|LETC=A&B|LFP-'] = true;
    expecColorMap2['NODE-ID:|RETURNC|RFP-'] = true;
    it('test2', () => {
        codeAnalyzer.createFlowChart(funcInput2, userInput2);
        assert.deepEqual(codeAnalyzer.colorMap, expecColorMap2);
    });

    const userInput3 = '';
    const funcInput3 = 'function foo(){\n' +
        '    return true;' +
    '}';
    let expecColorMap3 = {};
    expecColorMap3['NODE-ID:|FUNCTIONFOO()|FP-'] = true;
    expecColorMap3['NODE-ID:|RETURNTRUE|RFP-'] = true;
    it('test3', () => {
        codeAnalyzer.createFlowChart(funcInput3, userInput3);
        assert.deepEqual(codeAnalyzer.colorMap, expecColorMap3);
    });

    const userInput4 = '0,[1,2,3]';
    const funcInput4 = 'function foo(x,y){\n' +
        '    let a;' +
        '    a = y[x];' +
        '    y[x] = -1; ' +
        '    if (a == y[x])' +
        '       return "hey true";' +
        '    else' +
        '       return "hey false";' +
        '}';
    let expecColorMap4 = {};
    expecColorMap4['NODE-ID:|(A==Y[X])|(FP-'] =  true;
    expecColorMap4['NODE-ID:|A=Y[X]|AFP-'] = true;
    expecColorMap4['NODE-ID:|FUNCTIONFOO(X,Y)|FP-'] = true;
    expecColorMap4['NODE-ID:|LETA|LFP-'] = true;
    expecColorMap4['NODE-ID:|RETURN"HEYFALSE"|R(FP-'] = true;
    expecColorMap4['NODE-ID:|Y[X]=-1|YFP-'] = true;
    it('test4', () => {
        codeAnalyzer.createFlowChart(funcInput4, userInput4);
        assert.deepEqual(codeAnalyzer.colorMap, expecColorMap4);
    });

    const userInput5 = '[1],0';
    const funcInput5 = 'function foo(x,a){\n' +
        '    return x[a];' +
        '}';
    let expecColorMap5 = {};
    expecColorMap5['NODE-ID:|FUNCTIONFOO(X,A)|FP-'] = true;
    expecColorMap5['NODE-ID:|RETURNX[A]|RFP-'] = true;
    it('test5', () => {
        codeAnalyzer.createFlowChart(funcInput5, userInput5);
        assert.deepEqual(codeAnalyzer.colorMap, expecColorMap5);
    });

    const userInput6 = 'true';
    const funcInput6 = 'function foo(x){\n' +
        'if (x)\n' +
        'return "HOLA";\n' +
        'else\n' +
        'return "BYE";\n' +
        '}';
    let expecColorMap6 = {};
    expecColorMap6['NODE-ID:|(X)|(FP-'] = true;
    expecColorMap6['NODE-ID:|FUNCTIONFOO(X)|FP-'] = true;
    expecColorMap6['NODE-ID:|RETURN"HOLA"|R(FP-'] = true;
    it('test6', () => {
        codeAnalyzer.createFlowChart(funcInput6, userInput6);
        assert.deepEqual(codeAnalyzer.colorMap, expecColorMap6);
    });
});