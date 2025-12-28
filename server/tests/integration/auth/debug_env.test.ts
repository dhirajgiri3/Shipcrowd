describe('Debug Env', () => {
    it('should have MONGO_TEST_URI', () => {
        console.log('MONGO_TEST_URI:', process.env.MONGO_TEST_URI);
        console.log('NODE_ENV:', process.env.NODE_ENV);
    });
});
