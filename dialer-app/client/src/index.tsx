import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import theme from './theme';
import App from './App';
import './index.css';
import CallCountsProvider from './context/CallCountsContext';

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ChakraProvider theme={theme}>
        <CallCountsProvider>
          <App />
        </CallCountsProvider>
      </ChakraProvider>
    </BrowserRouter>
  </React.StrictMode>
);
