const { orderFiles } = require('../schemaFiles');

describe('orderFiles', () => {
  it('sorts a folder with no run-first files alphabetically', () => {
    expect(orderFiles('games/tables', ['submissions.sql', 'catalogue.sql'])).toEqual(['catalogue.sql', 'submissions.sql']);
  });

  it('runs a folder\'s run-first files before the rest', () => {
    expect(orderFiles('lfg/tables', ['interested.sql', 'posts.sql', 'invitees.sql']))
      .toEqual(['posts.sql', 'interested.sql', 'invitees.sql']);
  });

  it('skips run-first files the folder does not have', () => {
    expect(orderFiles('lfg/tables', ['invitees.sql'])).toEqual(['invitees.sql']);
  });
});
