describe('Lead card UI smoke test', () => {
  it('shows Source-Code label and Created date on first lead', () => {
    cy.visit('/');

    // Wait for leads to load
    cy.contains('Created:', { timeout: 20000 }).should('be.visible');

    // At least one span with title="Source Code" should exist
    cy.get('span[title="Source Code"]').should('exist');
  });
}); 