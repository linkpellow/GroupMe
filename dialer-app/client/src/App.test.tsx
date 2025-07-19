describe('App', () => {
  it('can be imported without errors', () => {
    // If this test runs without throwing, App and its dependencies are properly configured
    expect(() => require('./App')).not.toThrow();
  });
}); 