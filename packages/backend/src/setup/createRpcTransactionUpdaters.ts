import { Logger } from '@l2beat/common'
import { RpcTransactionApi } from '@l2beat/config'
import { ProjectId } from '@l2beat/types'
import { providers } from 'ethers'

import { Config } from '../config'
import { Clock } from '../core/Clock'
import { RpcTransactionUpdater } from '../core/transaction-count/RpcTransactionUpdater'
import { RpcTransactionCountRepository } from '../peripherals/database/RpcTransactionCountRepository'
import { EthereumClient } from '../peripherals/ethereum/EthereumClient'
import { assert } from '../tools/assert'

export function createRpcTransactionUpdaters(
  config: Config,
  rpcTransactionCountRepository: RpcTransactionCountRepository,
  clock: Clock,
  logger: Logger,
) {
  const rpcUpdaters: RpcTransactionUpdater[] = []
  for (const project of config.projects) {
    if (project.transactionApi?.type === 'rpc') {
      const l2Provider = createL2Provider(
        project.transactionApi,
        project.projectId,
        config,
      )

      const ethereumClient = new EthereumClient(
        l2Provider,
        logger,
        project.transactionApi.callsPerMinute,
      )

      const transactionUpdater = new RpcTransactionUpdater(
        ethereumClient,
        rpcTransactionCountRepository,
        clock,
        logger,
        project.projectId,
      )

      rpcUpdaters.push(transactionUpdater)
    }
  }

  return rpcUpdaters
}

function createL2Provider(
  rpc: RpcTransactionApi,
  projectId: ProjectId,
  config: Config,
) {
  assert(config.transactionCountSync)

  if (rpc.provider === 'jsonRpc') {
    return new providers.JsonRpcProvider({
      url: rpc.url,
      timeout: 10000,
    })
  }

  let apiKey = ''
  if (projectId === ProjectId('arbitrum')) {
    apiKey = config.transactionCountSync.arbitrumAlchemyApiKey
  }
  if (projectId === ProjectId('optimism')) {
    apiKey = config.transactionCountSync.optimismAlchemyApiKey
  }
  if (!apiKey) {
    throw new Error('Please provide alchemy api key')
  }

  return new providers.AlchemyProvider(rpc.networkName, apiKey)
}
