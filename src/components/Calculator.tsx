import { useState } from 'react';
import { ArrowLeft, Delete } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Mode = 'scientific' | 'converter';

export default function Calculator() {
  const navigate = useNavigate();
  const [display, setDisplay] = useState('0');
  const [memory, setMemory] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [mode, setMode] = useState<Mode>('scientific');
  const [isRadians, setIsRadians] = useState(true);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setMemory(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const backspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(-value));
  };

  const percentage = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (memory === null) {
      setMemory(display);
    } else if (operator) {
      const currentValue = parseFloat(memory);
      let result = 0;

      switch (operator) {
        case '+': result = currentValue + inputValue; break;
        case '-': result = currentValue - inputValue; break;
        case '×': result = currentValue * inputValue; break;
        case '÷': result = inputValue !== 0 ? currentValue / inputValue : 0; break;
        case '^': result = Math.pow(currentValue, inputValue); break;
      }

      setDisplay(String(result));
      setMemory(String(result));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const calculate = () => {
    if (!operator || memory === null) return;

    const inputValue = parseFloat(display);
    const currentValue = parseFloat(memory);
    let result = 0;

    switch (operator) {
      case '+': result = currentValue + inputValue; break;
      case '-': result = currentValue - inputValue; break;
      case '×': result = currentValue * inputValue; break;
      case '÷': result = inputValue !== 0 ? currentValue / inputValue : 0; break;
      case '^': result = Math.pow(currentValue, inputValue); break;
    }

    setDisplay(String(result));
    setMemory(null);
    setOperator(null);
    setWaitingForOperand(true);
  };

  // Scientific functions
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const toDegrees = (rad: number) => (rad * 180) / Math.PI;

  const scientificFunction = (fn: string) => {
    const value = parseFloat(display);
    let result = 0;

    switch (fn) {
      case 'sin':
        result = isRadians ? Math.sin(value) : Math.sin(toRadians(value));
        break;
      case 'cos':
        result = isRadians ? Math.cos(value) : Math.cos(toRadians(value));
        break;
      case 'tan':
        result = isRadians ? Math.tan(value) : Math.tan(toRadians(value));
        break;
      case 'ln':
        result = Math.log(value);
        break;
      case 'log':
        result = Math.log10(value);
        break;
      case 'sqrt':
        result = Math.sqrt(value);
        break;
      case 'cbrt':
        result = Math.cbrt(value);
        break;
      case 'x2':
        result = Math.pow(value, 2);
        break;
      case 'x3':
        result = Math.pow(value, 3);
        break;
      case '1/x':
        result = 1 / value;
        break;
      case 'e':
        result = Math.E;
        break;
      case 'pi':
        result = Math.PI;
        break;
      case 'abs':
        result = Math.abs(value);
        break;
      case 'exp':
        result = Math.exp(value);
        break;
      case '!':
        result = factorial(Math.floor(value));
        break;
    }

    setDisplay(String(result));
    setWaitingForOperand(true);
  };

  const factorial = (n: number): number => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  };

  // nCr and nPr - these need two inputs
  const [pendingCombination, setPendingCombination] = useState<{ type: 'nCr' | 'nPr'; n: number } | null>(null);

  const startCombination = (type: 'nCr' | 'nPr') => {
    const n = parseFloat(display);
    setPendingCombination({ type, n: Math.floor(n) });
    setWaitingForOperand(true);
  };

  const completeCombination = () => {
    if (!pendingCombination) return;
    const r = Math.floor(parseFloat(display));
    const n = pendingCombination.n;
    let result = 0;

    if (pendingCombination.type === 'nPr') {
      result = factorial(n) / factorial(n - r);
    } else {
      result = factorial(n) / (factorial(r) * factorial(n - r));
    }

    setDisplay(String(result));
    setPendingCombination(null);
    setWaitingForOperand(true);
  };

  const handleEquals = () => {
    if (pendingCombination) {
      completeCombination();
    } else {
      calculate();
    }
  };

  const Button = ({ 
    children, 
    onClick, 
    variant = 'default',
    className = ''
  }: { 
    children: React.ReactNode; 
    onClick: () => void; 
    variant?: 'default' | 'operator' | 'function';
    className?: string;
  }) => (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center rounded-xl text-lg font-medium
        transition-all active:scale-95
        ${variant === 'operator' 
          ? 'bg-primary/20 text-primary hover:bg-primary/30' 
          : variant === 'function'
          ? 'bg-muted/50 text-foreground hover:bg-muted'
          : 'bg-muted text-foreground hover:bg-muted/80'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        <div className="flex bg-muted rounded-full p-1">
          <button
            onClick={() => setMode('scientific')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              mode === 'scientific' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Scientific
          </button>
          <button
            onClick={() => setMode('converter')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              mode === 'converter' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            }`}
          >
            Basic
          </button>
        </div>

        <button 
          onClick={() => setIsRadians(!isRadians)}
          className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium"
        >
          {isRadians ? 'RAD' : 'DEG'}
        </button>
      </div>

      {/* Display */}
      <div className="flex-1 flex flex-col justify-end px-6 pb-4">
        {pendingCombination && (
          <div className="text-right text-muted-foreground text-sm mb-1">
            {pendingCombination.n} {pendingCombination.type === 'nCr' ? 'C' : 'P'} r
          </div>
        )}
        <div className="text-right text-5xl font-light tracking-tight overflow-x-auto">
          {display.length > 12 ? parseFloat(display).toExponential(6) : display}
        </div>
      </div>

      {/* Keypad */}
      <div className="p-3 pb-8 space-y-2">
        {mode === 'scientific' && (
          <div className="grid grid-cols-6 gap-2 mb-2">
            <Button onClick={() => startCombination('nCr')} variant="function" className="h-12 text-sm">nCr</Button>
            <Button onClick={() => startCombination('nPr')} variant="function" className="h-12 text-sm">nPr</Button>
            <Button onClick={backspace} variant="function" className="h-12"><Delete className="h-4 w-4" /></Button>
            <Button onClick={() => scientificFunction('exp')} variant="function" className="h-12 text-sm">eˣ</Button>
            <Button onClick={() => setIsRadians(!isRadians)} variant="function" className="h-12 text-sm">{isRadians ? 'Rad' : 'Deg'}</Button>
            <Button onClick={() => inputDigit('(')} variant="function" className="h-12">(</Button>

            <Button onClick={() => scientificFunction('e')} variant="function" className="h-12 text-sm">e</Button>
            <Button onClick={() => scientificFunction('ln')} variant="function" className="h-12 text-sm">ln</Button>
            <Button onClick={() => scientificFunction('log')} variant="function" className="h-12 text-sm">log₁₀</Button>
            <Button onClick={() => performOperation('^')} variant="function" className="h-12 text-sm">xʸ</Button>
            <Button onClick={() => scientificFunction('abs')} variant="function" className="h-12 text-sm">|x|</Button>
            <Button onClick={() => inputDigit(')')} variant="function" className="h-12">)</Button>

            <Button onClick={() => scientificFunction('sin')} variant="function" className="h-12 text-sm">sin</Button>
            <Button onClick={() => scientificFunction('cos')} variant="function" className="h-12 text-sm">cos</Button>
            <Button onClick={() => scientificFunction('tan')} variant="function" className="h-12 text-sm">tan</Button>
            <Button onClick={() => scientificFunction('pi')} variant="function" className="h-12 text-sm">π</Button>
            <Button onClick={() => scientificFunction('!')} variant="function" className="h-12 text-sm">x!</Button>
            <Button onClick={() => scientificFunction('1/x')} variant="function" className="h-12 text-sm">1/x</Button>

            <Button onClick={() => scientificFunction('x2')} variant="function" className="h-12 text-sm">x²</Button>
            <Button onClick={() => scientificFunction('x3')} variant="function" className="h-12 text-sm">x³</Button>
            <Button onClick={() => performOperation('^')} variant="function" className="h-12 text-sm">xⁿ</Button>
            <Button onClick={() => scientificFunction('sqrt')} variant="function" className="h-12 text-sm">√</Button>
            <Button onClick={() => scientificFunction('cbrt')} variant="function" className="h-12 text-sm">∛</Button>
            <Button onClick={() => performOperation('^')} variant="function" className="h-12 text-sm">ⁿ√</Button>
          </div>
        )}

        {/* Basic keypad */}
        <div className="grid grid-cols-4 gap-2">
          <Button onClick={clear} className="h-16">AC</Button>
          <Button onClick={toggleSign} className="h-16">±</Button>
          <Button onClick={percentage} className="h-16">%</Button>
          <Button onClick={() => performOperation('÷')} variant="operator" className="h-16">÷</Button>

          <Button onClick={() => inputDigit('7')} className="h-16">7</Button>
          <Button onClick={() => inputDigit('8')} className="h-16">8</Button>
          <Button onClick={() => inputDigit('9')} className="h-16">9</Button>
          <Button onClick={() => performOperation('×')} variant="operator" className="h-16">×</Button>

          <Button onClick={() => inputDigit('4')} className="h-16">4</Button>
          <Button onClick={() => inputDigit('5')} className="h-16">5</Button>
          <Button onClick={() => inputDigit('6')} className="h-16">6</Button>
          <Button onClick={() => performOperation('-')} variant="operator" className="h-16">−</Button>

          <Button onClick={() => inputDigit('1')} className="h-16">1</Button>
          <Button onClick={() => inputDigit('2')} className="h-16">2</Button>
          <Button onClick={() => inputDigit('3')} className="h-16">3</Button>
          <Button onClick={() => performOperation('+')} variant="operator" className="h-16">+</Button>

          <Button onClick={backspace} className="h-16"><Delete className="h-5 w-5" /></Button>
          <Button onClick={() => inputDigit('0')} className="h-16">0</Button>
          <Button onClick={inputDecimal} className="h-16">.</Button>
          <Button onClick={handleEquals} variant="operator" className="h-16">=</Button>
        </div>
      </div>
    </div>
  );
}
