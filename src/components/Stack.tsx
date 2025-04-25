import React, { useState } from 'react';
import TreeVisualization from './TreeVisualization';
import './Stack.css';

interface StackItem {
  value: string;
  id: number;
}

const Stack: React.FC = () => {
  const [stack, setStack] = useState<StackItem[]>([]);
  const [poppedItems, setPoppedItems] = useState<StackItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState('');
  const [showTree, setShowTree] = useState(false);

  const push = () => {
    if (!inputValue.trim()) {
      setMessage('Please enter a value to push');
      return;
    }
    setStack([...stack, { value: inputValue, id: Date.now() }]);
    setInputValue('');
    setMessage(`Pushed "${inputValue}" to stack`);
  };

  const pop = () => {
    if (stack.length === 0) {
      setMessage('Stack is empty');
      return;
    }
    const poppedItem = stack[stack.length - 1];
    const newStack = stack.slice(0, -1);
    setStack(newStack);
    setPoppedItems([...poppedItems, poppedItem]);
    setMessage(`Popped "${poppedItem.value}" from stack`);
  };

  const removePoppedItem = (id: number) => {
    setPoppedItems(poppedItems.filter(item => item.id !== id));
  };

  const clearPoppedItems = () => {
    setPoppedItems([]);
  };

  const peek = () => {
    if (stack.length === 0) {
      setMessage('Stack is empty');
      return;
    }
    setMessage(`Top element is: "${stack[stack.length - 1].value}"`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      push();
    }
  };

  const toggleTree = () => {
    setShowTree(!showTree);
  };

  return (
    <div className="layout-container">
      <div className={`stack-container ${showTree ? 'with-tree' : ''}`}>
        <button 
          className="visualization-toggle"
          onClick={toggleTree}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 3L6 8L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {showTree ? 'Hide Tree' : 'Show Tree'}
        </button>

        <h1>Stack Visualization</h1>
        
        <div className="controls">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter value to push"
          />
          <button onClick={push}>Push</button>
          <button onClick={pop}>Pop</button>
          <button onClick={peek}>Peek</button>
        </div>

        <p className="message">{message}</p>

        <div className="stack-visualization">
          <div className="stack-items-container">
            {stack.slice().reverse().map((item) => (
              <div key={item.id} className="stack-item">
                {item.value}
              </div>
            ))}
            <div className="stack-base">Stack Base</div>
          </div>
          
          <div className="popped-items-container">
            <div className="popped-items-label">Already checked</div>
            <div className="popped-items-list">
              {poppedItems.map((item) => (
                <div key={item.id} className="popped-item">
                  {item.value}
                  <div 
                    className="remove-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePoppedItem(item.id);
                    }}
                  >
                    ×
                  </div>
                </div>
              ))}
            </div>
            {poppedItems.length > 0 && (
              <div 
                className="clear-button"
                onClick={clearPoppedItems}
              >
                Clear
              </div>
            )}
          </div>
        </div>
      </div>

      <TreeVisualization visible={showTree} setVisible={setShowTree} />
    </div>
  );
};

export default Stack; 