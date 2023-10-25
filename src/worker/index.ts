import Service from '../service/index';
import redis from './redis';
import webHook from './webHook';

async function worker() {
  let allConsumeData: any;
  setInterval(async () => {
    allConsumeData = await Service.CRUD.find('Consume', { status: 'todo' }, [], '', '');
    console.log({ length: allConsumeData.length });
    const consumeData = await Service.CRUD.find('Consume', { status: 'todo' }, [], '', 'pipelineId', 400);
    if (consumeData.length != 0) {
      await Promise.all(
        consumeData.map(async (CD: any) => {
          let pipeLienData = await Service.CRUD.findById('Pipeline', CD.pipelineId.toString(), []);
          if (pipeLienData) {
            let pipelineArr = pipeLienData.destinationIds;
            pipelineArr?.forEach(async (el) => {
              let destinatinDetails: any = await Service.CRUD.findById('Destination', el.toString(), []);
              if (destinatinDetails.platform === 'redis') {
                await redis(destinatinDetails.credential, 'data', CD.data);
                await Service.CRUD.updateById('Consume', { status: 'done' }, CD._id, [], '');
              }
              if (destinatinDetails.platform === 'webHook') {
                const response = await webHook(destinatinDetails.credential.method, destinatinDetails.credential.url);
                if (response.data) {
                  // await Service.CRUD.updateById('Consume', { status: 'done' }, CD._id, [], '');
                  await Service.CRUD.hardDelete('Consume', CD._id);
                }
              }
            });
          }
        })
      );
    }
  }, 70);
  // }, 1000);
}

export default worker;
