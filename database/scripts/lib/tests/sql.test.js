const { splitStatements } = require('../sql');

describe('splitStatements', () => {
  it('splits on top-level semicolons', () => {
    expect(splitStatements('SELECT 1;\nSELECT 2;')).toEqual(['SELECT 1;', 'SELECT 2;']);
  });

  it('keeps a trailing statement without a semicolon', () => {
    expect(splitStatements('SELECT 1; SELECT 2')).toEqual(['SELECT 1;', 'SELECT 2']);
  });

  it('ignores semicolons in quotes, identifiers and comments', () => {
    const sql = `COMMENT ON TABLE t IS 'a; b''s';\nSELECT "x;y" FROM t; -- c; d\n/* e; f */ SELECT 3;`;
    expect(splitStatements(sql)).toEqual([
      `COMMENT ON TABLE t IS 'a; b''s';`,
      'SELECT "x;y" FROM t;',
      '-- c; d\n/* e; f */ SELECT 3;',
    ]);
  });

  it('keeps a dollar-quoted function body whole', () => {
    const fn = 'CREATE FUNCTION f() RETURNS TRIGGER AS $$\nBEGIN\n  NEW.x = 1;\n  RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;';
    expect(splitStatements(`${fn}\nREVOKE ALL ON FUNCTION f() FROM PUBLIC;`))
      .toEqual([fn, 'REVOKE ALL ON FUNCTION f() FROM PUBLIC;']);
  });

  it('drops comment-only pieces and keeps a comment with the statement it leads', () => {
    expect(splitStatements('-- header\n\nSELECT 1;\n\n-- footer\n')).toEqual(['-- header\n\nSELECT 1;']);
  });
});
