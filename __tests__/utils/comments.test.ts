import { stripComments } from '../../src/utils/comments'

describe('stripComments', () => {
  it('should strip trailing comments', async () => {
    expect(stripComments('val x = 1 // assert(x)')).toEqual('val x = 1 ')
  })

  it('should skip comment lines', async () => {
    expect(stripComments('// assert(x)')).toEqual('')
    expect(stripComments('  /* assert(x) */')).toBeNull()
    expect(stripComments('   * assert(x)')).toBeNull()
  })

  it('should keep code', async () => {
    expect(stripComments('assert(x)')).toEqual('assert(x)')
  })
})
