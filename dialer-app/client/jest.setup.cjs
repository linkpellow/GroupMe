// Mock import.meta.env
global.import = {
  meta: {
    env: {
      VITE_API_BASE: '/api',
      MODE: 'test'
    }
  }
}; 