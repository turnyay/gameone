import React, { memo } from 'react';
import './App.css';
import Game from './components/Game';

const App = memo(function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>GAMEONE</h1>
      </header>
      <main className="game-container">
        <Game />
      </main>
    </div>
  );
});

export default App; 