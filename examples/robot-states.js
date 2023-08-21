const ffi = require('ffi-napi');
const ref = require('ref-napi');
const ArrayType = require('ref-array-di')(ref);
const struct = require('ref-struct-di')(ref);

// Define necessary types
const String = ref.types.CString;
const Bool = ref.types.bool;
const UnsignedInt = ref.types.uint;
const DoubleArray = ArrayType(ref.types.double);
const StringArray = ArrayType(String);
// the properties are effectively defined as
// pointers to doubles so make sure we deref when using
// also note that might only give first element in array...
const RobotStates = struct({
  q: ref.refType('double'),
  theta: ref.refType('double'),
  dq: ref.refType('double'),
  dtheta: ref.refType('double'),
  tau: ref.refType('double'),
  tauDes: ref.refType('double'),
  tauDot: ref.refType('double'),
  tauExt: ref.refType('double'),
  tcpPose: ref.refType('double'),
  tcpPoseDes: ref.refType('double'),
  tcpVel: ref.refType('double'),
  camPose: ref.refType('double'),
  flangePose: ref.refType('double'),
  ftSensorRaw: ref.refType('double'),
  extWrenchInTcp: ref.refType('double'),
  extWrenchInBase: ref.refType('double')
});
const RobotInfo = ref.refType(ref.types.void); // Adjust as per actual structure definition
const PlanInfo = ref.refType(ref.types.void); // Adjust as per actual structure definition

const Robot = ref.refType(ref.types.void); // Represents pointer to Robot object

const flexivrdk = ffi.Library('./lib/flexivrdk.cpython-310-darwin.dylib', {
  Robot: [Robot, [String, String]],
  info: [RobotInfo, [Robot]],
  enable: ['void', [Robot]],
  stop: ['void', [Robot]],
  isOperational: [Bool, [Robot]],
  isBusy: [Bool, [Robot]],
  isConnected: [Bool, [Robot]],
  isFault: [Bool, [Robot]],
  isEstopReleased: [Bool, [Robot]],
  isRecoveryState: [Bool, [Robot]],
  connect: ['void', [Robot]],
  disconnect: ['void', [Robot]],
  clearFault: ['void', [Robot]],
  setMode: ['void', [Robot, UnsignedInt]], // Assuming Mode is an unsigned int
  getMode: [UnsignedInt, [Robot]], // Assuming Mode is an unsigned int
  getRobotStates: ['void', [Robot, RobotStates]],
  executePlan: ['void', [Robot, UnsignedInt]],
  executePlanByName: ['void', [Robot, String]],
  pausePlan: ['void', [Robot, Bool]],
  getPlanNameList: [StringArray, [Robot]],
  getPlanInfo: ['void', [Robot, PlanInfo]],
  executePrimitive: ['void', [Robot, String]],
  getPrimitiveStates: [StringArray, [Robot]],
  setGlobalVariables: ['void', [Robot, String]],
  getGlobalVariables: [StringArray, [Robot]],
  isStopped: [Bool, [Robot]],
  switchTcp: ['void', [Robot, UnsignedInt]],
  startAutoRecovery: ['void', [Robot]],
  streamJointTorque: ['void', [Robot, DoubleArray, Bool, Bool]],
  streamJointPosition: ['void', [Robot, DoubleArray, DoubleArray, DoubleArray]],
  sendJointPosition: [
    'void',
    [Robot, DoubleArray, DoubleArray, DoubleArray, DoubleArray, DoubleArray]
  ],
  streamCartesianMotionForce: ['void', [Robot, DoubleArray, DoubleArray]],
  sendCartesianMotionForce: ['void', [Robot, DoubleArray, DoubleArray]],
  setCartesianStiffness: ['void', [Robot, DoubleArray]],
  setNullSpacePosture: ['void', [Robot, DoubleArray]],
  writeDigitalOutput: ['void', [Robot, UnsignedInt, Bool]],
  readDigitalInput: [Bool, [Robot, UnsignedInt]]
});

function printRobotStates(robot) {
  const robotStates = new RobotStates();
  flexivrdk.getRobotStates(robot, robotStates);

  console.log('Current robot states:');
  console.log('q:', robotStates.q.deref());
  console.log('theta:', robotStates.theta.deref());
  console.log('dq:', robotStates.dq.deref());
  console.log('dtheta:', robotStates.dtheta.deref());
  // ... and so on for the other properties
}

function main(robotIp, localIp) {
  const robot = flexivrdk.Robot(robotIp, localIp);

  if (flexivrdk.isFault(robot)) {
    console.warn('Fault occurred on robot server, trying to clear ...');
    flexivrdk.clearFault(robot);
    setTimeout(() => {
      if (flexivrdk.isFault(robot)) {
        console.error('Fault cannot be cleared, exiting ...');
        process.exit(1);
      }
      console.info('Fault on robot server is cleared');
    }, 2000);
  }

  console.info('Enabling robot ...');
  flexivrdk.enable(robot);

  let secondsWaited = 0;
  const checkOperationalInterval = setInterval(() => {
    if (flexivrdk.isOperational(robot)) {
      console.info('Robot is now operational');
      clearInterval(checkOperationalInterval);
      printRobotStates(robot);
    } else if (secondsWaited >= 10) {
      console.warn(
        'Still waiting for robot to become operational, please check the robot.'
      );
      clearInterval(checkOperationalInterval);
    }
    secondsWaited++;
  }, 1000);
}

const robotIp = process.argv[2];
const localIp = process.argv[3];

main(robotIp, localIp);
