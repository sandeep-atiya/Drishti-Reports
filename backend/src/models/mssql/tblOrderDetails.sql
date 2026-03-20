USE [DristhiSoftTechDB]
GO

/****** Object:  Table [dbo].[tblOrderDetails]    Script Date: 20-03-2026 15:43:20 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[tblOrderDetails](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[ptId] [varchar](50) NULL,
	[OrderNo] [varchar](50) NULL,
	[PId] [varchar](50) NULL,
	[callType] [int] NULL,
	[name] [varchar](50) NULL,
	[mobile] [varchar](50) MASKED WITH (FUNCTION = 'partial(2, "XXXXXX", 2)') NULL,
	[alterMob] [varchar](50) MASKED WITH (FUNCTION = 'partial(2, "XXXXXX", 2)') NULL,
	[Mobile3] [varchar](15) MASKED WITH (FUNCTION = 'partial(2, "XXXXXX", 2)') NULL,
	[Guradian] [varchar](20) NULL,
	[son_of] [varchar](50) NULL,
	[house_no] [varchar](100) NULL,
	[Street] [varchar](100) NULL,
	[Floor] [varchar](100) NULL,
	[landmark] [varchar](100) NULL,
	[Landmark2] [varchar](100) NULL,
	[PostID] [varchar](50) NULL,
	[post] [varchar](100) NULL,
	[tehseel] [varchar](100) NULL,
	[district] [varchar](100) NULL,
	[city] [varchar](100) NULL,
	[state] [varchar](100) NULL,
	[Country] [varchar](100) NULL,
	[pin_code] [varchar](50) NULL,
	[problem] [varchar](max) NULL,
	[OtherProblem] [varchar](max) NULL,
	[Problem_ID] [varchar](10) NULL,
	[comment] [varchar](max) NULL,
	[disposition_Code] [varchar](100) NULL,
	[Discount] [int] NULL,
	[total_amount] [int] NULL,
	[gross_amount] [int] NULL,
	[cod] [varchar](20) NULL,
	[doctor_name] [varchar](100) NULL,
	[verifier_name] [varchar](100) NULL,
	[dialer] [int] NULL,
	[dis_status] [int] NULL,
	[odate] [datetime] NULL,
	[vdate] [datetime] NULL,
	[createdOn] [datetime] NULL,
	[UpdatedOn] [datetime] NULL,
	[status] [int] NULL,
	[ass_flage] [int] NULL,
	[campaign_Id] [int] NULL,
	[detained_session] [varchar](200) NULL,
	[OrderDate] [date] NULL,
	[OrderTime] [time](7) NULL,
	[UpdatedDate] [date] NULL,
	[UpdatedTime] [time](7) NULL,
	[NumOfCalls] [int] NULL,
	[DownloadStatus] [varchar](3) NULL,
	[DispatchStatus] [varchar](3) NULL,
	[DispatchedDate] [date] NULL,
	[ByCourier] [varchar](50) NULL,
	[rejected_reason] [nvarchar](200) NULL,
	[WayBillNo] [varchar](50) NULL,
	[FollowUpDate] [datetime] NULL,
	[DeniedReason] [varchar](100) NULL,
	[DeniedReasonID] [int] NULL,
	[CourierUpdatedOn] [datetime] NULL,
	[CourierUpdatedBy] [varchar](50) NULL,
	[CourtesyCall] [int] NULL,
	[CourtesyDate] [datetime] NULL,
	[ReOrderCall] [int] NULL,
	[ReOrderFollowup] [datetime] NULL,
	[UrgentOrder] [int] NULL,
	[UrgentOrderAmount] [int] NULL,
	[DelayDispatch] [int] NULL,
	[DelayDispatchDate] [date] NULL,
	[AddressID] [int] NULL,
	[AddressUsedOn] [date] NULL,
	[ReqCancel] [varchar](10) NULL,
	[CancelReason] [varchar](100) NULL,
	[UserByCancel] [varchar](100) NULL,
	[CanDate] [datetime] NULL,
	[CourierRemark] [varchar](50) NULL,
	[PushStatus] [varchar](20) NULL,
	[PushErrorDetails] [varchar](500) NULL,
	[ReConsultation] [bit] NULL,
	[CHANNEL_ID] [numeric](4, 0) NULL,
	[OrderType] [int] NULL,
	[OnlineOrderNo] [varchar](50) NULL,
	[Disp_Verifier] [varchar](50) NULL,
	[Disp_Flag] [int] NULL,
	[Disp_Code] [varchar](50) NULL,
	[Disp_Date] [datetime] NULL,
	[CourierName] [varchar](70) NULL,
	[DiscountReq] [int] NULL,
	[PrefercallTime] [time](7) NULL,
	[PushDate] [datetime] NULL,
	[ratingflag] [bit] NULL,
	[AgentID] [int] NULL,
	[VerifiiedBy] [nchar](10) NULL,
	[EscalationId] [int] NULL,
	[Source] [nchar](15) NULL,
	[IsCounsellingAssign] [bit] NULL,
	[CouselerName] [varchar](50) NULL,
	[CounsellingPtid] [nvarchar](50) NULL,
	[ReVerify] [bit] NULL,
	[NewPatientVerification] [bit] NULL,
	[SalesDelayDispatch] [int] NULL,
	[SalesDelayDispatchDate] [date] NULL,
	[IsSMSSent] [int] NULL,
	[Counsellingid] [int] NULL,
	[DelayDate] [date] NULL,
	[JobStatus] [int] NULL,
	[JobStatusUpdate] [int] NULL,
 CONSTRAINT [PK_tblOrderDetails] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [tblOrderDetails_OrderNo] UNIQUE NONCLUSTERED 
(
	[OrderNo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[tblOrderDetails] ADD  CONSTRAINT [DF__tblOrderD__Order__33D4B598]  DEFAULT (getdate()) FOR [OrderDate]
GO

ALTER TABLE [dbo].[tblOrderDetails] ADD  CONSTRAINT [DF__tblOrderD__Order__34C8D9D1]  DEFAULT (CONVERT([varchar](8),getdate(),(108))) FOR [OrderTime]
GO

ALTER TABLE [dbo].[tblOrderDetails] ADD  CONSTRAINT [DF__tblOrderD__Updat__35BCFE0A]  DEFAULT (getdate()) FOR [UpdatedDate]
GO

ALTER TABLE [dbo].[tblOrderDetails] ADD  CONSTRAINT [DF__tblOrderD__Updat__36B12243]  DEFAULT (CONVERT([varchar](8),getdate(),(108))) FOR [UpdatedTime]
GO

ALTER TABLE [dbo].[tblOrderDetails] ADD  CONSTRAINT [DF_tblOrderDetails_IsCounsellingAssign]  DEFAULT ((0)) FOR [IsCounsellingAssign]
GO

ALTER TABLE [dbo].[tblOrderDetails] ADD  CONSTRAINT [DF_tblOrderDetails_NewPatientVerification]  DEFAULT ((0)) FOR [NewPatientVerification]
GO

ALTER TABLE [dbo].[tblOrderDetails] ADD  CONSTRAINT [DF_tblOrderDetails_IsSMSSent]  DEFAULT ((0)) FOR [IsSMSSent]
GO

ALTER TABLE [dbo].[tblOrderDetails] ADD  CONSTRAINT [DF_tblOrderDetails_JobStatus]  DEFAULT ((1)) FOR [JobStatus]
GO


