<template>

  <Upload multiple type="drag" action="https://192.168.1.1:8090" show-upload-list accept=".wav" name=".wav"
    before-uplode="beforeUpLoad">
    <div style="padding: 0 0">
      <Icon type="ios-cloud-upload" size="52" style="color: #3399ff"></Icon>
      <p>点击或将wav文件拖拽到这里上传</p>
    </div>
  </Upload>


</template>

<script>
  export default {
    methods: {
      beforeUpLoad(file) {
        console.log(file.name)
        return false
      }
    }
  }
</script>

<style>
  .ivu-upload-drag {
    position: relative;
    height: 200px;
    text-align: center;
  }

  .ivu-upload-drag div {
    position: absolute;
    top: 50%;
    left: 50%;
    margin-left: -88.67px;
    margin-top: -35px;
  }
</style>