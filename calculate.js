document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('display');
    let state = {
        isNewCalculation: false,
        lastChar: ''
    };

    if (typeof math === 'undefined') {
        console.error('math.js kütüphanesi yüklenmedi!');
        display.value = 'Kütüphane Hatası!';
        return;
    }

    setupKeyboardListeners();
    setupButtonListeners();

    const appendToDisplay = (value) => {
        clearErrorIfExists();
        if (state.isNewCalculation && !isOperator(value)) {
            if (!isOperator(state.lastChar)) display.value = '';
            state.isNewCalculation = false;
        }
        if (value === '!' && display.value.match(/-?\d+$/)) {
            const lastNumber = parseInt(display.value.match(/-?\d+$/)[0]);
            if (lastNumber < 0) {
                display.value = 'Geçersiz İşlem!';
                state.lastChar = '';
                return;
            }
        }
        display.value += value;
        state.lastChar = value.slice(-1);
        if (/[\(\)\[\]]/.test(value)) updatePlaceholder();
    };

    const clearDisplay = () => {
        display.value = '';
        state.isNewCalculation = false;
        state.lastChar = '';
        updatePlaceholder();
    };

    const backspaceAction = () => {
        display.value = display.value.slice(0, -1);
        state.lastChar = display.value.slice(-1);
        updatePlaceholder();
    };

    const calculateResult = () => {
        if (!display.value || display.value === 'Hata!' || display.value === 'Geçersiz Sonuç!') return;

        if (display.value.match(/-?\d+!/)) {
            const factorialMatches = display.value.match(/-?\d+!/g);
            for (const match of factorialMatches) {
                const num = parseInt(match.slice(0, -1));
                if (num < 0) {
                    display.value = 'Geçersiz İşlem!';
                    state.lastChar = '';
                    return;
                }
            }
        }

        let expression = prepareExpression(display.value);
        try {
            const result = evaluateExpression(expression);
            display.value = Number.isNaN(result) || result === undefined ? 'Geçersiz Sonuç!' : result.toString();
            state.lastChar = display.value.slice(-1);
            state.isNewCalculation = true;
        } catch (error) {
            display.value = error.message || 'Hata!';
            state.lastChar = '';
        }
        updatePlaceholder();
    };

    const isOperator = (char) => ['+', '-', '*', '/', '^', '!', '(', ')', '[', ']', '%', 'mod'].includes(char);

    const updatePlaceholder = () => {
        const openParens = (display.value.match(/[\(\[]/g) || []).length;
        const closeParens = (display.value.match(/[\)\]]/g) || []).length;
        display.placeholder = openParens > closeParens ? ')'.repeat(openParens - closeParens) : '';
    };

    const clearErrorIfExists = () => {
        if (/Hata!|Geçersiz|tanımsız|hatası/.test(display.value)) {
            display.value = '';
            state.lastChar = '';
            state.isNewCalculation = false;
        }
    };

    const prepareExpression = (expr) => {
        let result = expr;
        const openParens = (result.match(/[\(\[]/g) || []).length;
        const closeParens = (result.match(/[\)\]]/g) || []).length;
        if (openParens > closeParens) result += ')'.repeat(openParens - closeParens);

        result = result.replace(/π/g, Math.PI.toString());
        result = result.replace(/\|([^|]+)\|/g, (_, inner) => Math.abs(math.evaluate(inner)).toString());
        
        result = result.replace(/(-?\d+)!/g, (_, num) => {
            const n = parseInt(num);
            if (n < 0) throw new Error('Geçersiz İşlem!');
            return factorial(n);
        });

        result = result.replace(/(\-?\d*\.?\d+)\s*%\s*(\-?\d*\.?\d+)/g, (_, a, b) => (a * b / 100).toString());
        result = result.replace(/(\-?\d*\.?\d+)\s*mod\s*(\-?\d*\.?\d+)/g, (_, a, b) => `${a} % ${b}`);
        result = result.replace(/cot\(([^)]+)\)/g, (_, inner) => {
            const value = math.evaluate(inner);
            if (Math.abs(math.tan(value)) < 1e-10) throw new Error('Kotanjant tanımsız!');
            return (1 / math.tan(value)).toString();
        });
        result = result.replace(/\[/g, '(').replace(/\]/g, ')');
        return result;
    };

    const evaluateExpression = (expr) => math.evaluate(expr);

    const factorial = (num) => {
        if (num < 0) throw new Error('Geçersiz İşlem!');
        let result = 1;
        for (let i = 2; i <= num; i++) result *= i;
        return result;
    };

    const appendFunction = (func) => {
        clearErrorIfExists();
        const currentValue = display.value.trim();
        if (!currentValue || isOperator(currentValue.slice(-1))) {
            appendToDisplay(`${func}(`);
        } else if (/[\dπ\]\)]/.test(currentValue.slice(-1))) {
            const lastNumberMatch = currentValue.match(/(\d*\.?\d+|\π)$/);
            if (lastNumberMatch) {
                const lastNumber = lastNumberMatch[0];
                const beforeNumber = currentValue.slice(0, -lastNumber.length);
                display.value = beforeNumber + `${func}(${lastNumber}`;
                state.lastChar = '(';
                updatePlaceholder();
            } else {
                appendToDisplay(`${func}(`);
            }
        }
    };

    const handleOperator = (op) => {
        if (op === '-' && (!display.value || /[\(\[]/.test(display.value.slice(-1)) || display.value.slice(-1) === '^')) {
            appendToDisplay('-');
        } else if (/[\dπ\]\)]/.test(display.value.slice(-1))) {
            appendToDisplay(op === '%' ? ' % ' : op);
        } else if (/[\(\[]/.test(op) && (!display.value || isOperator(display.value.slice(-1)))) {
            appendToDisplay(op);
        } else if (op === ']') {
            const openBrackets = (display.value.match(/\[/g) || []).length;
            const closeBrackets = (display.value.match(/\]/g) || []).length;
            if (openBrackets > closeBrackets && /[\dπ\)]/.test(display.value.slice(-1))) {
                appendToDisplay(']');
            }
        }
    };

    const appendPi = () => {
        const currentValue = display.value.trim();
        if (!currentValue || isOperator(currentValue.slice(-1)) || state.isNewCalculation) {
            appendToDisplay('π');
            state.isNewCalculation = false;
        } else if (/[\dπ\]\)]/.test(currentValue.slice(-1))) {
            appendToDisplay('*π');
        }
    };

    function setupKeyboardListeners() {
        document.addEventListener('keydown', (event) => {
            const key = event.key;

            // Fn tuşu ile birlikte basıldığında veya F1-F12 tuşları tek başına basıldığında girişi engelle
            if (event.getModifierState('Fn') || /^F\d{1,2}$/.test(key)) {
                event.preventDefault();
                return;
            }

            if (key === 'Enter') {
                event.preventDefault();
                calculateResult();
            } else if (key === 'Backspace') {
                backspaceAction();
            } else if (key === 'Delete') {
                clearDisplay();
            } else if (key === 'p' || key === 'π') {
                appendPi();
            } else if (/[0-9]/.test(key)) {
                appendToDisplay(key);
            } else if (['/', '*', '-', '+', '.', '(', ')', '[', ']', '%', '^', '!'].includes(key)) {
                handleOperator(key);
            } else if (key === 's') {
                appendFunction('sin');
            } else if (key === 'c') {
                appendFunction('cos');
            } else if (key === 't') {
                appendFunction('cot');
            }
        });
    }

    function setupButtonListeners() {
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('click', () => {
                const value = button.textContent;
                clearErrorIfExists();
                switch (value) {
                    case 'C': clearDisplay(); break;
                    case '=': calculateResult(); break;
                    case 'π': appendPi(); break;
                    case 'rnd': roundNumber(); break;
                    case 'x!': if (/\d/.test(state.lastChar)) appendToDisplay('!'); break;
                    case 'xʸ': if (/\d/.test(state.lastChar)) appendToDisplay('^'); break;
                    case '√': squareRoot(); break;
                    case 'x²': squaring(); break;
                    case '|x|': applyAbsoluteValue(); break;
                    case '1/x': reciprocal(); break;
                    case 'sin': appendFunction('sin'); break;
                    case 'cos': appendFunction('cos'); break;
                    case 'cot': appendFunction('cot'); break;
                    case 'mod': if (/[\dπ\]\)]/.test(state.lastChar)) appendToDisplay(' mod '); break;
                    case '←': backspaceAction(); break;
                    default: if (/[+\-*/()\[\]%]/.test(value)) handleOperator(value); else appendToDisplay(value);
                }
                button.blur();
                updatePlaceholder();
            });
        });
    }

    const roundNumber = () => {
        const numericValue = math.evaluate(display.value.replace('π', Math.PI));
        if (!Number.isNaN(numericValue)) {
            const result = Math.round(numericValue).toString();
            display.value = result;
            state.lastChar = result.slice(-1);
            state.isNewCalculation = true;
        } else {
            display.value = 'Geçersiz İşlem!';
            state.lastChar = '';
            state.isNewCalculation = false;
        }
    };

    const squareRoot = () => {
        const value = math.evaluate(display.value);
        if (!Number.isNaN(value)) {
            const result = value < 0 ? 'Negatif Karekök Tanımsız!' : Math.sqrt(value).toString();
            display.value = result;
            state.lastChar = result.slice(-1);
            state.isNewCalculation = true;
        } else {
            display.value = 'Geçersiz İşlem!';
            state.lastChar = '';
            state.isNewCalculation = false;
        }
    };

    const squaring = () => {
        const value = math.evaluate(display.value);
        if (!Number.isNaN(value)) {
            const result = Math.pow(value, 2).toString();
            display.value = result;
            state.lastChar = result.slice(-1);
            state.isNewCalculation = true;
        } else {
            display.value = 'Geçersiz İşlem!';
            state.lastChar = '';
            state.isNewCalculation = false;
        }
    };

    const reciprocal = () => {
        const value = math.evaluate(display.value);
        if (!Number.isNaN(value)) {
            const result = value === 0 ? 'Sıfıra Bölme Hatası!' : (1 / value).toString();
            display.value = result;
            state.lastChar = result.slice(-1);
            state.isNewCalculation = true;
        } else {
            display.value = 'Geçersiz İşlem!';
            state.lastChar = '';
            state.isNewCalculation = false;
        }
    };

    const applyAbsoluteValue = () => {
        const value = math.evaluate(display.value);
        if (!Number.isNaN(value)) {
            const result = Math.abs(value).toString();
            display.value = result;
            state.lastChar = result.slice(-1);
            state.isNewCalculation = true;
        } else {
            display.value = 'Geçersiz İşlem!';
            state.lastChar = '';
            state.isNewCalculation = false;
        }
    };
});