/** Small pixel bursts, sampled from simulation time so pause and slow motion agree. */
export function impactMotion(age:number,index:number,heavy:boolean){
  const duration=heavy?.42:.28;
  const progress=Math.max(0,Math.min(1,age/duration));
  const angle=index*2.399963;
  const spread=(heavy?25:13)*Math.sqrt(progress);
  return {x:Math.cos(angle)*spread,y:Math.sin(angle)*spread*.65+progress*progress*7,
    alpha:age<0||age>=duration?0:1-progress,size:heavy&&index%3===0?2:1};
}
