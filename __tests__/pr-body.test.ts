import * as core from '@actions/core'
import { checkPrBody } from '../src/pr-body'

let setFailedMock: jest.SpyInstance
describe('checkPrBody', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    jest.spyOn(core, 'info').mockImplementation()
    jest.spyOn(core, 'warning').mockImplementation()
  })

  it('should check bodyContains on its own', async () => {
    checkPrBody('some body', 'Test', '')
    expect(setFailedMock).toHaveBeenCalled()
  })

  it('should check bodyDoesNotContain on its own', async () => {
    checkPrBody('some FIXME body', '', 'FIXME')
    expect(setFailedMock).toHaveBeenCalled()
  })

  it('should pass a valid body', async () => {
    checkPrBody('Test body', 'Test', 'FIXME')
    expect(setFailedMock).not.toHaveBeenCalled()
  })
})
