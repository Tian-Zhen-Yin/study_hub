SET NAMES utf8mb4;
UPDATE questions SET stem='某大型企业ERP系统的架构采用了表示层、业务逻辑层、数据访问层三层分离的设计。这种架构最主要的优点是（）。', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=1663;
UPDATE questions SET stem='计算机系统中硬件层之上的软件通常按照三层来划分，自底向上依次为①、②、③，则①②③分别表示（1）。', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=1934;
UPDATE questions SET stem='某公司欲为某种型号的示波器开发内置软件。该公司的架构师设计了一套软件架构，其中划分了数据采集、信号处理、显示等功能模块及硬件构件，但仅覆盖了系统内部构成。在软件架构评审时，专家认为该架构存在的问题是（49）。', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=2056;
UPDATE questions SET stem='利用需求跟踪能力链（traceability link）可以跟踪一个需求使用的全过程，也就是从初始需求到实现的前后生存期。需求跟踪能力链有 4 类，链条自源头的①出发，经被跟踪对象②延伸至各类前后工作产品。其中的①和②分别是(24)。', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=2105;
UPDATE questions SET stem='在 PKI（公钥基础设施）系统结构中，负责生成和签署数字证书的是（ ）。', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=2220;
UPDATE questions SET stem='某航空公司机票销售系统有 n 个售票点，该系统为每个售票点创建一个进程 Pi（i=1，2，…，n）管理机票销售。假设 Tj（j=1，2，…，m）单元存放某日某航班的机票剩余票数，Temp 为 Pi 进程的临时工作单元，x 为某用户的订票张数。若用 P、V 操作实现各售票点进程对剩余票数 Tj 的互斥访问，则初始化时系统应将信号量 S 赋值为（ ）。', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=2381;
UPDATE questions SET stem='一个大型软件系统的需求总是有变化的。为了降低项目开发的风险，需要一个好的变更控制过程。需求变更管理过程通常由①②③三个阶段依次构成，①②③处对应的内容应是（ ）。', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=2408;
UPDATE questions SET stem='对于遗留系统的评价框架，按技术水平（高/低）和业务价值（高/低）两个维度将遗留系统划分为四个区域，那么处于“高水平、低价值”区的遗留系统适合于采用的演化策略为（37）。', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=2417;
UPDATE questions SET stem='某计算机系统输入/输出采用双缓冲工作方式。假设磁盘块与缓冲区大小相同，每个盘块读入缓冲区的时间 T 为 10μs，缓冲区送用户区的时间 M 为 6μs，系统对每个磁盘块数据的处理时间 C 为 2μs。若用户需要将大小为 10 个磁盘块的 Doc1 文件逐块从磁盘读入缓冲区，并送用户区进行处理，那么采用双缓冲需要花费的时间为（5）μs。', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=2459;
UPDATE questions SET stem='一个好的变更控制过程，给项目风险承担者提供了正式的建议变更机制。需求变更管理过程通常由①②③三个阶段依次构成，①②③处对应的内容应分别是(25)。', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=2554;
UPDATE questions SET stem='云计算服务体系结构包含三个层次，自上而下的①、②、③分别与 SaaS、PaaS、IaaS 三种服务模式相对应，则①、②、③应为（ ）。', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=2828;
UPDATE questions SET stem='某计算机系统中有一个 CPU、一台扫描仪和一台打印机。现有三个图像处理任务，每个任务有三个程序段：扫描 Si、图像处理 Ci 和打印 Pi（i=1，2，3）。下图为三个任务各程序段并发执行的前驱图，其中，可并行执行的是（ ）。', image_url='/uploads/q1935.svg', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=1935;
UPDATE questions SET stem='某软件公司欲开发一个 Windows 平台上的公告板系统。在明确用户需求后，该公司的架构师决定采用 Command 模式实现该系统的界面显示部分，并设计 UML 类图如下图所示。图中与 Command 模式中的“Invoker”角色相对应的类是（30）。', image_url='/uploads/q1963.svg', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=1963;
UPDATE questions SET stem='某公司欲开发一门户网站，将公司的各个分公司及办事处信息进行整合。故决定采用 Composite 设计模式来实现公司的组织结构关系，并设计了如下图所示的 UML 类图。图中与 Composite 模式中的“Component”角色相对应的类是（33）。', image_url='/uploads/q2114.svg', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=2114;
UPDATE questions SET stem='主机 PC 对某个域名进行查询，最终由该域名的授权域名服务器解析并返回结果，查询过程如下图所示。这种查询方式中不合理的是（15）。', image_url='/uploads/q2245.svg', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=2245;
UPDATE questions SET stem='某软件公司欲开发一个绘图软件，要求使用不同的绘图程序绘制不同的图形。在明确用户需求后，该公司的架构师决定采用 Bridge 模式实现该软件，并设计 UML 类图如下图所示。图中与 Bridge 模式中的“Abstraction”角色相对应的类是（32）。', image_url='/uploads/q2412.svg', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=2412;
UPDATE questions SET stem='在网络规划中，政府内外网之间应该部署网络安全防护设备。下图中部署在政府内网与外网之间的设备 A 是（64）。', image_url='/uploads/q2592.svg', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=2592;
UPDATE questions SET stem='某计算机系统中的进程管理采用三态模型，那么下图所示的 PCB（进程控制块）的组织方式采用（2）。', image_url='/uploads/q2605.svg', flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=2605;
UPDATE questions SET analysis='**考点定位**:本题考查前驱图与进程间的制约关系(同步与互斥、直接制约与间接制约),是操作系统进程管理的高频考点。
**正确项论证**:前驱图约束为:任务内 S1→C1→P1(等流程依赖),同类段间 S1→S2→S3、C1→C2→C3、P1→P2→P3(设备/CPU互斥)。逐步推演:S1完成后,**C1与S2**均无未满足前驱,可并行;C1、S2完成后,**P1、C2、S3**三者可并行;其后**P2与C3**可并行。故选A。
**干扰项辨析**:B、C按单个任务内部的顺序(S1C1P1等)罗列,混淆了"顺序执行链"与"并行执行";D将同类程序段(S1S2S3等)视为并行,忽略了单台扫描仪、单CPU、单打印机的互斥约束——同类段必须串行。
**易混淆对比**:直接制约源于进程间**合作关系**(同任务内前后段同步);间接制约源于**资源共享**(S1、S2、S3竞争扫描仪而互斥)。' WHERE id=1935;
UPDATE questions SET flag_type=NULL, flag_note=NULL, flagged_at=NULL WHERE id=1701;
