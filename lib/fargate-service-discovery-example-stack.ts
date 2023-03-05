import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  BastionHostLinux,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ApplicationTargetGroup,
  TargetType,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as log from "aws-cdk-lib/aws-logs";
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";
import { Duration } from "aws-cdk-lib";

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class FargateServiceDiscoveryExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const SERVICE_NAME = "fsde-back";
    const NAMESPACE = "local";

    const vpc = new Vpc(this, "VPC", {
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: SubnetType.PUBLIC,
        },
      ],
    });

    const dnsNamespace = new servicediscovery.PrivateDnsNamespace(
      this,
      "ServiceDiscovery",
      {
        name: NAMESPACE,
        vpc,
      }
    );

    const frontSG = new SecurityGroup(this, "FrontSecurityGroup", {
      vpc,
    });

    const backSG = new SecurityGroup(this, "BackSecurityGroup", {
      vpc,
    });

    backSG.addIngressRule(frontSG, Port.tcp(1235));

    const backendTask = new ecs.FargateTaskDefinition(this, "BackendTask", {
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
      },
      memoryLimitMiB: 512,
      cpu: 256,
    });

    const backendContainer = backendTask.addContainer("BackendContainer", {
      image: ecs.ContainerImage.fromAsset("./back/"),
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: "ecs-fsde-back",
        logRetention: log.RetentionDays.ONE_MONTH,
      }),
      healthCheck: {
        command: ["CMD-SHELL", "curl -f http://localhost:1235 || exit 1"],
        retries: 2,
        interval: Duration.seconds(30),
        timeout: Duration.seconds(15),
        startPeriod: Duration.seconds(5),
      },
    });

    backendContainer.addPortMappings({
      containerPort: 1235,
      hostPort: 1235,
    });

    const backCluster = new ecs.Cluster(this, "BackCluster", {
      vpc,
    });

    new ecs.FargateService(this, "BackendService", {
      cluster: backCluster,
      taskDefinition: backendTask,
      desiredCount: 4,
      assignPublicIp: true,
      enableExecuteCommand: true,
      cloudMapOptions: {
        name: SERVICE_NAME,
        cloudMapNamespace: dnsNamespace,
        dnsRecordType: servicediscovery.DnsRecordType.A,
        dnsTtl: Duration.seconds(30),
      },
      securityGroups: [backSG],
    });

    const securityGroupELB = new SecurityGroup(this, "SecurityGroupELB", {
      vpc,
    });

    securityGroupELB.addIngressRule(Peer.ipv4("0.0.0.0/0"), Port.tcp(80));

    const alb = new ApplicationLoadBalancer(this, "ALB", {
      vpc,
      securityGroup: securityGroupELB,
      internetFacing: true,
    });

    const listenerHTTP = alb.addListener("ListenerHTTP", {
      port: 80,
    });

    const targetGroup = new ApplicationTargetGroup(this, "TG", {
      vpc,
      port: 1234,
      protocol: ApplicationProtocol.HTTP,
      targetType: TargetType.IP,
      healthCheck: {
        path: "/health",
        healthyHttpCodes: "200",
      },
    });

    listenerHTTP.addTargetGroups("DefaultHttpResponse", {
      targetGroups: [targetGroup],
    });

    const cluster = new ecs.Cluster(this, "FrontCluster", {
      vpc,
    });

    const fargateTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "TaskDefinition",
      {
        memoryLimitMiB: 512,
        cpu: 256,
      }
    );

    const frontContainer = fargateTaskDefinition.addContainer(
      "frontContainer",
      {
        image: ecs.ContainerImage.fromAsset("./front/"),
        logging: ecs.LogDriver.awsLogs({
          streamPrefix: "ecs-fsde-front",
          logRetention: log.RetentionDays.ONE_MONTH,
        }),
      }
    );
    frontContainer.addPortMappings({
      containerPort: 1234,
      hostPort: 1234,
    });

    const frontService = new ecs.FargateService(this, "Service", {
      cluster,
      taskDefinition: fargateTaskDefinition,
      desiredCount: 1,
      assignPublicIp: true,
      securityGroups: [frontSG],
    });

    frontService.attachToApplicationTargetGroup(targetGroup);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'FargateServiceDiscoveryExampleQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
