BaseWallet

钱包的基础的合约，并包含owner的相关管理，可以用new创建钱包

一般钱包通过factory合约进行创建

* init
  * 给钱包初始化一个owner和模块组
  * 输入 ：owner（Address）， module（address[]）
* isOwner
  * 判断所给地址是否为钱包的owner
  * 输入：所需判断的地址
  * 输出：bool
* addOwner
  * 给钱包添加owner，owner个数最大为三，当已有三个owner的时候不可以进行添加
  * 输入：需要添加的owner地址，不可为已有owner的地址，不可为address（0）
* deleteOwner
  * 删除指定的owner，钱包必须含有一个owner，当钱包只剩一个owner时不可进行删除
  * 输入：需要删除的owner地址，必须为已有的owner
* getOwners
  * 获取钱包的所有owner地址
  * 输入：无
  * 输出：address[]
* changeOwner
  * 更换钱包的owner
  * 输入：旧的owner，新的owner，旧owner必须为钱包已拥有的owner，新owner不可为钱包拥有的owner



Factory

管理合约钱包的创建的合约

* createrCounterfactualWallet
  * 创建钱包地址
  * 输入： owner(address)，modules(address)，salt(bytes20)，refundAmount(uint256), refundToken(address)，ownerSignature(bytes)，managerSignature(bytes)
  * 输出：钱包对象



Managed

管理管理者的合约，可添加/删除管理者

* addManager
  * 添加管理者
  * 输入：需要添加的管理者地址
* revokeManager
  * 删除管理者
  * 输入：需要删除的管理者地址
* changeRefundAdddress
  * 更换钱包的refundAddress（回退地址）
  * 输入：新的回退地址



RelayerManager

中继管理器，可以可用于调用其他合约函数

* execute
  * 进行签名验证，名调用指定的合约函数，通过relay-manager.js 中的relay调用
  * 输入：wallet（address），data（bytes）， nonce（uint256），signatures（bytes），gasPrice（uint256），gasLimit（uint256），refundToken(address), refundAddress(address)



SecurityManager

钱包的安全相关的管理，包含监护人的管理，钱包的恢复管理，以及钱包的锁/解锁

* isGuardian
  * 判断给定给定地址是否为钱包的guardian
  * 输入：钱包的地址，需要判断是否为guardian的地址
  * 输出：bool
* guardianCount
  * 获取钱包拥有的guardian数
  * 输入：需要查询的钱包的地址
  * 输出：guardian的个数（uint256）
* getGuardians
  * 获取钱包的所有guardian地址
  * 输入：需要查询的钱包地址
  * 输出：钱包所有guardians地址（address[]）
* addGuardian
  * 添加监护人
  * 输入：钱包地址，需添加的guardian地址，需添加的guardian不可为钱包的地址，也不可为钱包已有的guardian
* confirmGuardianAddition
  * 确认添加guardian，需要在处理期之后和安全期之前才可以进行确认
  * 输入：钱包地址，确认添加的guardian地址，guardian需在待处理列表中。
* cancelGuardianAddition
  * 取消添加guardian
  * 输入：钱包地址，需要取消添加的guardian地址，该guardian必须在待处理列表中
* revokeGuardian
  * 移除监护人
  * 输入：钱包地址，需移除的Guardian地址，guardian需已为钱包的guardian
* confirmGuardianRevokation
  * 确认移除监护人，需要在处理期之后和安全期之前才可以进行确认
  * 输入：钱包地址，确认删除的guardian地址，guardian需要在待处理列表中
* cancelGuardianRevokation
  * 取消删除guardian
  * 输入：钱包地址，需要取消删除的guardian地址，guardian需要在待处理列表中
* setLock
  * 设置锁
  * 输入：钱包地址，releaseTime（uint256）， locker（bytes4）
* lock
  * 锁定钱包，只有guardian/自身可以调用
  * 输入：钱包地址
* unlock
  * 解锁钱包，只有guardian/自身可调用
  * 输入：钱包地址
* getLock
  * 查询钱包的锁定时间
  * 输入：钱包地址
* isLock
  * 判断钱包是否被锁定了
  * 输入：钱包地址
* executeRecovery
  * 执行钱包的恢复，需要guardian的二分之一人数进行恢复，owner不可以参与，通过RelayerManager的execute函数调用
  * 输入：钱包地址，新owner地址，新owner不可以为钱包的已拥有的owner，不可为address（0），不可为钱包的guardian
* finalizeRecovery
  * 完成恢复，所有人可以执行，需要在执行时间过后完成
  * 输入：钱包地址
* cancelRecovery
  * 取消恢复钱包，需要guardian的二分一人数/owner+guardian二分之一减一的人数，才可以执行函数
  * 输入：钱包地址
* getRecovery
  * 获取恢复钱包的信息
  * 输入：钱包地址
  * 输出：owner地址，executeTime（执行时间，uint64），guardianCount（uint32）



WalletDetector

* addCodeAndImplementationFromWallet
  * 添加钱包相关信息至列表
  * 输入：钱包地址
* getImplementations
  * 获取列表中的所有Implementations
  * 输出：address[]
* getCodes
  * 获取列表中的所有codeHash
  * 输出：bytes32[]
* isWallet
  * 判断给定地址是否为合约钱包
  * 输入：判断的地址
  * 输出：bool



WalletModule

合约钱包内部功能的模组集合

* 构造函数
  * 输入：registry(address),guardianStorage(address),transferStorage(address),authoriser(address),uniswapRouter(address),SECURITY_PERIOD(uint256), SECURITY_WINDOW(uint256), LOCK_PERIOD(uint256), RECOVERY_PERIOD(uint256)
  * 【参考test文件夹中各文件的使用】